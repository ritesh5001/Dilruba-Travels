import type { PublicBooking } from "@dilruba/shared/booking";
import { todayIST, type AdminInstalment } from "@dilruba/shared/ops";
import { randomInt } from "node:crypto";
import { sql, type Transaction } from "kysely";
import { db } from "../db/index.ts";
import type { Booking, Customer, Database, Departure, Instalment, NewNote, Payment } from "../db/schema.ts";
import { notifyAdmin, sendEmail } from "../email/send.ts";
import { adminPaymentEmail, bookingStatusEmail, feedbackRequestEmail, paymentReceivedEmail } from "../email/templates.ts";
import { normalizePhone } from "../lib/util.ts";
import { paymentProvider } from "../payments/index.ts";
import { getSettings } from "./settings.ts";

type Executor = typeof db | Transaction<Database>;

/** One customer per phone number; later submissions refresh their name and email. */
export async function upsertCustomer(trx: Executor, input: { name: string; phone: string; email?: string | null }) {
  const phone = normalizePhone(input.phone);
  return trx
    .insertInto("customers")
    .values({ name: input.name, phone, email: input.email?.toLowerCase() ?? null })
    .onConflict((oc) =>
      oc.column("phone").doUpdateSet((eb) => ({
        name: eb.ref("excluded.name"),
        email: sql<string | null>`coalesce(excluded.email, customers.email)`,
        updated_at: sql<Date>`now()`,
      })),
    )
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function addEvent(trx: Executor, note: Omit<NewNote, "kind">) {
  await trx.insertInto("notes").values({ ...note, kind: "event" }).execute();
}

type Money = Pick<Booking, "total_amount" | "tcs_amount" | "amount_paid">;

/** Everything the customer pays: the package price plus any TCS. Null until the price is set. */
export function payable(b: Pick<Booking, "total_amount" | "tcs_amount">) {
  return b.total_amount === null ? null : b.total_amount + b.tcs_amount;
}

export function balanceOf(b: Money) {
  const p = payable(b);
  return p === null ? null : Math.max(0, p - b.amount_paid);
}

/**
 * How far the booking's payments cover each instalment. Payments go to instalments in due-date
 * order, so "₹50,000 paid" against [40k, 40k] means the first is paid and the second part paid.
 */
export function instalmentStates(instalments: Instalment[], amountPaid: number, today = todayIST()): AdminInstalment[] {
  let left = amountPaid;
  return [...instalments]
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.id - b.id)
    .map((i) => {
      const covered = Math.min(i.amount, Math.max(0, left));
      left -= covered;
      const state = covered >= i.amount ? "paid" : i.due_date < today ? "overdue" : covered > 0 ? "part_paid" : "due";
      return { id: i.id, label: i.label, dueDate: i.due_date, amount: i.amount, covered, state, reminderSentAt: i.reminder_sent_at?.toISOString() ?? null };
    });
}

/**
 * What "Pay now" charges: the rest of the deposit first; then, with an instalment plan, enough
 * to clear the next instalment; otherwise the whole balance.
 */
export function dueNow(b: Pick<Booking, "total_amount" | "tcs_amount" | "deposit_amount" | "amount_paid" | "status">, instalments: Instalment[] = []) {
  if (b.total_amount === null || b.status === "cancelled" || b.status === "completed" || b.status === "requested") return 0;
  const balance = balanceOf(b) ?? 0;
  if (b.deposit_amount !== null && b.amount_paid < b.deposit_amount) return Math.min(balance, b.deposit_amount - b.amount_paid);
  const next = instalmentStates(instalments, b.amount_paid).find((i) => i.state !== "paid");
  if (next) return Math.min(balance, next.amount - next.covered);
  return balance;
}

export function toPublicBooking(b: Booking, c: Customer, payments: Payment[], extra: { instalments: Instalment[]; departure: Departure | null }): PublicBooking {
  return {
    reference: b.reference,
    status: b.status,
    packageTitle: b.package_title,
    travelMonth: b.travel_month,
    adults: b.adults,
    children: b.children,
    name: c.name,
    totalAmount: b.total_amount,
    depositAmount: b.deposit_amount,
    tcsAmount: b.tcs_amount,
    amountPaid: b.amount_paid,
    departure: extra.departure ? { title: extra.departure.title, startDate: extra.departure.start_date, endDate: extra.departure.end_date } : null,
    instalments: instalmentStates(extra.instalments, b.amount_paid).map(({ label, dueDate, amount, state }) => ({ label, dueDate, amount, state })),
    dueNow: dueNow(b, extra.instalments),
    balance: balanceOf(b),
    payments: payments
      .filter((p) => p.status === "paid")
      .map((p) => ({ amount: p.amount, method: p.method, paidAt: (p.paid_at ?? p.created_at).toISOString() })),
    onlinePaymentsEnabled: paymentProvider !== null,
    createdAt: b.created_at.toISOString(),
  };
}

/** The deposit (or a payment covering it) confirms the booking automatically. */
function statusAfterPayment(b: Booking, amountPaid: number) {
  if (b.status !== "requested" && b.status !== "awaiting_payment") return b.status;
  const threshold = b.deposit_amount ?? payable(b) ?? 1;
  return amountPaid >= threshold ? "confirmed" : b.status;
}

/**
 * Marks a gateway order as paid. Safe to call more than once for the same order (the browser
 * callback and the webhook both report the same payment); only the first call has any effect.
 */
export async function markOnlinePaymentPaid(input: { orderId: string; paymentId: string; method?: string; provider: string }) {
  const result = await db.transaction().execute(async (trx) => {
    const payment = await trx
      .selectFrom("payments")
      .selectAll()
      .where("provider", "=", input.provider)
      .where("provider_order_id", "=", input.orderId)
      .forUpdate()
      .executeTakeFirst();
    if (!payment) return { found: false as const };
    if (payment.status === "paid") return { found: true as const, alreadyPaid: true as const, bookingId: payment.booking_id };

    await trx
      .updateTable("payments")
      .set({ status: "paid", provider_payment_id: input.paymentId, method: input.method ?? "online", paid_at: new Date() })
      .where("id", "=", payment.id)
      .execute();

    const booking = await trx.selectFrom("bookings").selectAll().where("id", "=", payment.booking_id).forUpdate().executeTakeFirstOrThrow();
    const amountPaid = booking.amount_paid + payment.amount;
    const status = statusAfterPayment(booking, amountPaid);
    const updated = await trx
      .updateTable("bookings")
      .set({ amount_paid: amountPaid, status, updated_at: new Date() })
      .where("id", "=", booking.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await addEvent(trx, {
      booking_id: booking.id,
      customer_id: booking.customer_id,
      body: `Online payment of ₹${(payment.amount / 100).toLocaleString("en-IN")} received (${input.paymentId}).${status !== booking.status ? ` Status changed to ${status}.` : ""}`,
    });
    return { found: true as const, alreadyPaid: false as const, booking: updated, amount: payment.amount, bookingId: booking.id };
  });

  if (result.found && !result.alreadyPaid) {
    const customer = await db.selectFrom("customers").selectAll().where("id", "=", result.booking.customer_id).executeTakeFirstOrThrow();
    void sendPaymentEmails(result.booking, customer, result.amount);
  }
  return result;
}

async function sendPaymentEmails(b: Booking, c: Customer, amount: number) {
  if (c.email) await sendEmail(paymentReceivedEmail(b, c, amount));
  await notifyAdmin(adminPaymentEmail(b, c, amount));
}

export async function markOnlinePaymentFailed(input: { orderId: string; provider: string }) {
  await db
    .updateTable("payments")
    .set({ status: "failed" })
    .where("provider", "=", input.provider)
    .where("provider_order_id", "=", input.orderId)
    .where("status", "=", "created")
    .execute();
}

/** Staff record a payment taken outside the website (bank transfer, UPI, cash…). */
export async function recordManualPayment(bookingId: number, input: { amount: number; method: string; note?: string; sendReceipt: boolean; author?: string }) {
  const booking = await db.transaction().execute(async (trx) => {
    const b = await trx.selectFrom("bookings").selectAll().where("id", "=", bookingId).forUpdate().executeTakeFirst();
    if (!b) return null;
    await trx
      .insertInto("payments")
      .values({ booking_id: b.id, provider: "manual", method: input.method, amount: input.amount, status: "paid", note: input.note ?? null, paid_at: new Date() })
      .execute();
    const amountPaid = b.amount_paid + input.amount;
    const status = statusAfterPayment(b, amountPaid);
    const updated = await trx
      .updateTable("bookings")
      .set({ amount_paid: amountPaid, status, updated_at: new Date() })
      .where("id", "=", b.id)
      .returningAll()
      .executeTakeFirstOrThrow();
    await addEvent(trx, {
      booking_id: b.id,
      customer_id: b.customer_id,
      author: input.author ?? null,
      body: `Payment of ₹${(input.amount / 100).toLocaleString("en-IN")} recorded (${input.method})${input.note ? `: ${input.note}` : ""}.${status !== b.status ? ` Status changed to ${status}.` : ""}`,
    });
    return updated;
  });
  if (booking && input.sendReceipt) {
    const customer = await db.selectFrom("customers").selectAll().where("id", "=", booking.customer_id).executeTakeFirstOrThrow();
    if (customer.email) void sendEmail(paymentReceivedEmail(booking, customer, input.amount));
  }
  return booking;
}

export async function sendStatusEmail(b: Booking) {
  const customer = await db.selectFrom("customers").selectAll().where("id", "=", b.customer_id).executeTakeFirstOrThrow();
  if (!customer.email) return false;
  // A finished trip gets the feedback request (with their referral code) instead of a plain thank-you.
  if (b.status === "completed" && (await getSettings()).feedbackRequests) return sendFeedbackRequest(b, customer);
  const email = bookingStatusEmail(b, customer, b.status);
  return email ? sendEmail(email) : false;
}

export async function sendFeedbackRequest(b: Booking, customer: Customer) {
  if (!customer.email) return false;
  const settings = await getSettings();
  const code = await ensureReferralCode(customer.id);
  const sent = await sendEmail(feedbackRequestEmail(b, customer, { referralCode: code, referralOffer: settings.referralOffer }));
  if (sent) await db.updateTable("bookings").set({ feedback_requested_at: new Date() }).where("id", "=", b.id).execute();
  return sent;
}

// No 0/O/1/I/L, like booking references.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** The customer's own referral code, created the first time it's needed: e.g. AYESHA7K2. */
export async function ensureReferralCode(customerId: number) {
  const c = await db.selectFrom("customers").select(["name", "referral_code"]).where("id", "=", customerId).executeTakeFirstOrThrow();
  if (c.referral_code) return c.referral_code;
  const stem = (c.name.split(/\s+/)[0] ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "DT";
  for (let attempt = 0; attempt < 8; attempt++) {
    let code = stem;
    for (let i = 0; i < 3; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    const taken = await db.selectFrom("customers").select("id").where("referral_code", "=", code).executeTakeFirst();
    if (taken) continue;
    const row = await db
      .updateTable("customers")
      .set({ referral_code: code })
      .where("id", "=", customerId)
      .where("referral_code", "is", null)
      .returning("referral_code")
      .executeTakeFirst();
    if (row) return code;
    // Someone else set it at the same moment: use theirs.
    return (await db.selectFrom("customers").select("referral_code").where("id", "=", customerId).executeTakeFirstOrThrow()).referral_code!;
  }
  throw new Error("Could not create a referral code");
}

/** Links a new customer to whoever referred them (first referral wins; no self-referrals). */
export async function applyReferral(trx: Executor, customerId: number, code: string | undefined) {
  if (!code) return null;
  const referrer = await trx.selectFrom("customers").select(["id", "name"]).where("referral_code", "=", code.trim().toUpperCase()).executeTakeFirst();
  if (!referrer || referrer.id === customerId) return null;
  const updated = await trx
    .updateTable("customers")
    .set({ referred_by: referrer.id })
    .where("id", "=", customerId)
    .where("referred_by", "is", null)
    .returning("id")
    .executeTakeFirst();
  return updated ? referrer : null;
}
