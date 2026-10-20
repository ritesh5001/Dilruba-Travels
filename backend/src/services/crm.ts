import type { PublicBooking } from "@dilruba/shared/booking";
import { sql, type Transaction } from "kysely";
import { db } from "../db/index.ts";
import type { Booking, Customer, Database, NewNote, Payment } from "../db/schema.ts";
import { notifyAdmin, sendEmail } from "../email/send.ts";
import { adminPaymentEmail, bookingStatusEmail, paymentReceivedEmail } from "../email/templates.ts";
import { normalizePhone } from "../lib/util.ts";
import { paymentProvider } from "../payments/index.ts";

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

/** What "Pay now" charges: the rest of the deposit first, then the balance. */
export function dueNow(b: Pick<Booking, "total_amount" | "deposit_amount" | "amount_paid" | "status">) {
  if (b.total_amount === null || b.status === "cancelled" || b.status === "completed" || b.status === "requested") return 0;
  const balance = Math.max(0, b.total_amount - b.amount_paid);
  if (b.deposit_amount !== null && b.amount_paid < b.deposit_amount) return Math.min(balance, b.deposit_amount - b.amount_paid);
  return balance;
}

export function toPublicBooking(b: Booking, c: Customer, payments: Payment[]): PublicBooking {
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
    amountPaid: b.amount_paid,
    dueNow: dueNow(b),
    balance: b.total_amount === null ? null : Math.max(0, b.total_amount - b.amount_paid),
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
  const threshold = b.deposit_amount ?? b.total_amount ?? 1;
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
export async function recordManualPayment(bookingId: number, input: { amount: number; method: string; note?: string; sendReceipt: boolean }) {
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
  const email = bookingStatusEmail(b, customer, b.status);
  return email ? sendEmail(email) : false;
}
