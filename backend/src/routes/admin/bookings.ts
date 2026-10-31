import { bookingStatuses, bookingStatusLabels, formatINR, formatTravelMonth, paymentMethodLabels, paymentMethods, type PaymentMethod } from "@dilruba/shared/booking";
import type { AdminBooking, AdminBookingDetail, Paged } from "@dilruba/shared/crm";
import { costInputSchema, financialYear, formatDay, instalmentPlanSchema, splitGst, supplierTypeForCost, todayIST, type InvoiceData } from "@dilruba/shared/ops";
import { site } from "@dilruba/shared/site";
import { Router, type Response } from "express";
import { sql } from "kysely";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { sendEmail } from "../../email/send.ts";
import { bookingLink, feedbackLink, instalmentReminderEmail, paymentRequestEmail, refundEmail } from "../../email/templates.ts";
import { currentUser, requirePermission, userCan } from "../../lib/auth.ts";
import { likePattern, PAGE_SIZE, pageParam, parseBody, parseId } from "../../lib/util.ts";
import { paymentProvider } from "../../payments/index.ts";
import { addEvent, balanceOf, dueNow, instalmentStates, payable, recordManualPayment, sendFeedbackRequest, sendStatusEmail } from "../../services/crm.ts";
import { getSettings, tcsFor } from "../../services/settings.ts";
import { findOrCreateSupplier, supplierLedger } from "../../services/suppliers.ts";
import { bookingsQuery, documentsFor, toAdminBooking, toAdminCost, toAdminNote, toAdminPayment, toAdminTraveller } from "./mappers.ts";
import { travellersRouter } from "./travellers.ts";

export const bookingsAdminRouter = Router();

bookingsAdminRouter.get("/", async (req, res) => {
  const page = pageParam(req.query.page);
  const status = bookingStatuses.find((s) => s === req.query.status);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const departure = parseId(req.query.departure);

  let query = bookingsQuery();
  if (status) query = query.where("bookings.status", "=", status);
  if (departure) query = query.where("bookings.departure_id", "=", departure);
  if (q) {
    const pattern = likePattern(q);
    query = query.where((eb) =>
      eb.or([
        eb("bookings.reference", "ilike", pattern),
        eb("bookings.package_title", "ilike", pattern),
        eb("customers.name", "ilike", pattern),
        eb("customers.phone", "ilike", pattern),
        eb("customers.email", "ilike", pattern),
      ]),
    );
  }
  const [rows, count] = await Promise.all([
    query.orderBy("bookings.created_at", "desc").limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE).execute(),
    query.clearSelect().select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
  ]);
  const body: Paged<AdminBooking> = { items: rows.map(toAdminBooking), total: Number(count.n), page, pageSize: PAGE_SIZE };
  res.json(body);
});

// Who may do what on a booking (viewing is checked where the router is mounted).
const canEditTrip = requirePermission("bookings.write");
const canTakePayments = requirePermission("payments.write");
const canWriteNotes = requirePermission("bookings.write", "payments.write", "travellers.write");
const canManageCosts = requirePermission("costs");

async function loadBooking(id: number, showCosts: boolean): Promise<AdminBookingDetail | null> {
  const row = await bookingsQuery().where("bookings.id", "=", id).executeTakeFirst();
  if (!row) return null;
  const [payments, notes, travellers, instalments, costs, feedback, quote, settings] = await Promise.all([
    db.selectFrom("payments").selectAll().where("booking_id", "=", id).where("status", "!=", "created").orderBy("created_at", "desc").execute(),
    db.selectFrom("notes").selectAll().where("booking_id", "=", id).orderBy("created_at", "desc").execute(),
    db.selectFrom("travellers").selectAll().where("booking_id", "=", id).orderBy("id").execute(),
    db.selectFrom("instalments").selectAll().where("booking_id", "=", id).execute(),
    showCosts
      ? db
          .selectFrom("booking_costs")
          .leftJoin("suppliers", "suppliers.id", "booking_costs.supplier_id")
          .selectAll("booking_costs")
          .select("suppliers.name as supplier_name")
          .where("booking_costs.booking_id", "=", id)
          .orderBy("booking_costs.id")
          .execute()
      : Promise.resolve(null),
    db
      .selectFrom("feedback")
      .leftJoin("reviews", "reviews.feedback_id", "feedback.id")
      .select(["feedback.rating", "feedback.comment", "feedback.can_publish", "feedback.created_at", "reviews.id as review_id"])
      .where("feedback.booking_id", "=", id)
      .executeTakeFirst(),
    db.selectFrom("quotes").select("id").where("booking_id", "=", id).executeTakeFirst(),
    getSettings(),
  ]);
  const [docs, ledger] = await Promise.all([
    documentsFor(travellers.map((t) => t.id)),
    supplierLedger((costs ?? []).flatMap((c) => (c.supplier_id ? [c.supplier_id] : []))),
  ]);
  return {
    ...toAdminBooking(row),
    packageCategory: row.package_category,
    packageSlug: row.package_slug,
    customerNotes: row.customer_notes,
    mobile: row.mobile,
    passportNumber: row.passport_number,
    roomType: row.room_type,
    leadId: row.lead_id,
    dueNow: dueNow(row, instalments),
    customerLink: bookingLink(row),
    onlinePaymentsEnabled: paymentProvider !== null,
    payments: payments.map(toAdminPayment),
    notes: notes.map(toAdminNote),
    travellers: travellers.map((t) => toAdminTraveller(t, docs.get(t.id))),
    instalments: instalmentStates(instalments, row.amount_paid),
    costs: costs?.map((c) => toAdminCost(c, ledger.costs.get(c.id))) ?? null,
    invoiceNumber: row.invoice_number,
    suggestedTcs: tcsFor(settings, row.package_category, row.total_amount),
    feedback: feedback
      ? { rating: feedback.rating, comment: feedback.comment, canPublish: feedback.can_publish, reviewId: feedback.review_id, createdAt: feedback.created_at.toISOString() }
      : null,
    feedbackLink: feedbackLink(row),
    quoteId: quote?.id ?? null,
  };
}

export async function respondWithBooking(res: Response, id: number) {
  const booking = await loadBooking(id, userCan(res, "costs"));
  if (!booking) res.status(404).json({ ok: false, error: "Booking not found" });
  else res.json(booking);
}

bookingsAdminRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Booking not found" });
  await respondWithBooking(res, id);
});

const rupees = z.coerce.number().min(0).max(10_000_000);
const updateSchema = z
  .object({
    status: z.enum(bookingStatuses).optional(),
    // Admin forms work in rupees; stored as paise.
    totalAmount: rupees.nullable().optional(),
    depositAmount: rupees.nullable().optional(),
    tcsAmount: rupees.optional(),
    customerNotes: z.string().trim().max(1000).nullable().optional(),
    mobile: z.string().trim().regex(/^[+\d][\d\s-]{7,16}$/).nullable().optional(),
    passportNumber: z.string().trim().min(5).max(30).regex(/^[a-zA-Z0-9 -]+$/).nullable().optional(),
    roomType: z.enum(["single", "double", "triple", "quad"]).nullable().optional(),
    packageCategory: z.string().trim().max(40).nullable().optional(),
    packageSlug: z.string().trim().max(120).nullable().optional(),
    packageTitle: z.string().trim().min(1).max(160).optional(),
    travelMonth: z.string().trim().regex(/^\d{4}-\d{2}$/).nullable().optional(),
    adults: z.coerce.number().int().min(1).max(50).optional(),
    children: z.coerce.number().int().min(0).max(50).optional(),
    departureId: z.coerce.number().int().positive().nullable().optional(),
    notifyCustomer: z.boolean().default(true),
  })
  .refine((d) => d.depositAmount == null || d.totalAmount == null || d.depositAmount <= d.totalAmount, {
    message: "The deposit can't be more than the total price",
  });

const toPaise = (rupee: number | null | undefined) => (rupee == null ? rupee : Math.round(rupee * 100));

/** Seats left on a departure, not counting this booking's own travellers. */
async function seatsLeft(departureId: number, exceptBookingId: number) {
  const d = await db
    .selectFrom("departures")
    .select(["seats", "title", "status"])
    .select((eb) =>
      eb
        .selectFrom("bookings")
        .whereRef("bookings.departure_id", "=", "departures.id")
        .where("bookings.status", "!=", "cancelled")
        .where("bookings.id", "!=", exceptBookingId)
        .select((s) => s.fn.coalesce(s.fn.sum<number>(s("bookings.adults", "+", s.ref("bookings.children"))), s.val(0)).as("n"))
        .as("booked"),
    )
    .where("id", "=", departureId)
    .executeTakeFirst();
  return d ? { ...d, left: d.seats - Number(d.booked ?? 0) } : null;
}

bookingsAdminRouter.patch("/:id", requirePermission("bookings.write", "payments.write"), async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(updateSchema, req.body, res);
  if (!id || !data) return;
  const me = currentUser(res);
  const before = await db.selectFrom("bookings").selectAll().where("id", "=", id).executeTakeFirst();
  if (!before) return void res.status(404).json({ ok: false, error: "Booking not found" });

  // The price form also sends the trip details, so check what actually changes: prices need
  // the payments permission, everything else the bookings permission.
  const changed = <T,>(next: T | undefined, current: T) => next !== undefined && next !== current;
  const priceChanged =
    changed(toPaise(data.totalAmount), before.total_amount) || changed(toPaise(data.depositAmount), before.deposit_amount) || changed(toPaise(data.tcsAmount), before.tcs_amount);
  const tripChanged =
    changed(data.customerNotes, before.customer_notes) ||
    changed(data.mobile, before.mobile) ||
    changed(data.passportNumber, before.passport_number) ||
    changed(data.roomType, before.room_type) ||
    changed(data.packageCategory, before.package_category) ||
    changed(data.packageSlug, before.package_slug) ||
    changed(data.status, before.status) ||
    changed(data.packageTitle, before.package_title) ||
    changed(data.travelMonth, before.travel_month) ||
    changed(data.adults, before.adults) ||
    changed(data.children, before.children) ||
    changed(data.departureId, before.departure_id);
  if (priceChanged && !userCan(res, "payments.write")) return void res.status(403).json({ ok: false, error: "Only accounts or a manager can change prices" });
  if (tripChanged && !userCan(res, "bookings.write")) return void res.status(403).json({ ok: false, error: "Only operations or a manager can change the trip details or status" });
  if (before.refunded_amount > 0 && data.status !== undefined && data.status !== "cancelled") {
    return void res.status(400).json({ ok: false, error: `${formatINR(before.refunded_amount)} has been refunded on this booking, so it stays cancelled. Make a new booking instead.` });
  }

  const total = data.totalAmount === undefined ? before.total_amount : toPaise(data.totalAmount)!;
  const deposit = data.depositAmount === undefined ? before.deposit_amount : toPaise(data.depositAmount)!;
  if (deposit !== null && total !== null && deposit > total) {
    return void res.status(400).json({ ok: false, error: "The deposit can't be more than the total price" });
  }

  const departureId = data.departureId === undefined ? before.departure_id : data.departureId;
  const travellers = (data.adults ?? before.adults) + (data.children ?? before.children);
  const travellersChanged = travellers !== before.adults + before.children;
  if (departureId && (departureId !== before.departure_id || travellersChanged)) {
    const seats = await seatsLeft(departureId, id);
    if (!seats) return void res.status(400).json({ ok: false, error: "That departure no longer exists" });
    if (seats.left < travellers) {
      return void res.status(409).json({ ok: false, error: `${seats.title} has only ${Math.max(0, seats.left)} seat${seats.left === 1 ? "" : "s"} left for ${travellers} travellers. Add seats to the departure first.` });
    }
  }

  const updated = await db.transaction().execute(async (trx) => {
    const b = await trx
      .updateTable("bookings")
      .set({
        status: data.status,
        total_amount: total,
        deposit_amount: deposit,
        tcs_amount: data.tcsAmount === undefined ? undefined : toPaise(data.tcsAmount)!,
        package_title: data.packageTitle,
        package_category: data.packageCategory,
        package_slug: data.packageSlug,
        customer_notes: data.customerNotes,
        mobile: data.mobile,
        passport_number: data.passportNumber?.toUpperCase() ?? data.passportNumber,
        room_type: data.roomType,
        travel_month: data.travelMonth,
        adults: data.adults,
        children: data.children,
        departure_id: departureId,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    const changes: string[] = [];
    if (b.status !== before.status) changes.push(`status ${bookingStatusLabels[before.status]} → ${bookingStatusLabels[b.status]}`);
    if (b.total_amount !== before.total_amount) changes.push(`total ${formatINR(before.total_amount)} → ${formatINR(b.total_amount)}`);
    if (b.deposit_amount !== before.deposit_amount) changes.push(`deposit ${formatINR(before.deposit_amount)} → ${formatINR(b.deposit_amount)}`);
    if (b.tcs_amount !== before.tcs_amount) changes.push(`TCS ${formatINR(before.tcs_amount)} → ${formatINR(b.tcs_amount)}`);
    if (b.customer_notes !== before.customer_notes) changes.push("customer notes updated");
    if (b.mobile !== before.mobile || b.passport_number !== before.passport_number) changes.push("contact / passport details updated");
    if (b.room_type !== before.room_type) changes.push(`room sharing → ${b.room_type ?? "unspecified"}`);
    if (b.package_category !== before.package_category || b.package_slug !== before.package_slug) changes.push("package link updated");
    if (b.package_title !== before.package_title) changes.push(`package → ${b.package_title}`);
    if (b.travel_month !== before.travel_month) changes.push(`travel month → ${b.travel_month ?? "flexible"}`);
    if (b.adults !== before.adults || b.children !== before.children) changes.push(`travellers → ${b.adults} adults, ${b.children} children`);
    if (b.departure_id !== before.departure_id) changes.push(b.departure_id ? `departure #${b.departure_id}` : "removed from departure");
    if (changes.length) await addEvent(trx, { booking_id: id, customer_id: b.customer_id, author: me.name, body: `${me.name} updated: ${changes.join("; ")}.` });
    return b;
  });

  if (updated.status !== before.status && data.notifyCustomer) {
    const sent = await sendStatusEmail(updated);
    if (sent) {
      const what = updated.status === "completed" ? "feedback request and referral code" : `booking ${updated.status}`;
      await addEvent(db, { booking_id: id, customer_id: updated.customer_id, body: `Emailed customer: ${what}.` });
    }
  }
  await respondWithBooking(res, id);
});

/** Emails the customer their price and a link to pay online. */
bookingsAdminRouter.post("/:id/payment-request", canTakePayments, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Booking not found" });
  let b = await db.selectFrom("bookings").selectAll().where("id", "=", id).executeTakeFirst();
  if (!b) return void res.status(404).json({ ok: false, error: "Booking not found" });
  if (b.total_amount === null) return void res.status(400).json({ ok: false, error: "Set the total price first" });
  if (b.status === "cancelled" || b.status === "completed") {
    return void res.status(400).json({ ok: false, error: `This booking is ${b.status}` });
  }
  const customer = await db.selectFrom("customers").selectAll().where("id", "=", b.customer_id).executeTakeFirstOrThrow();
  if (!customer.email) return void res.status(400).json({ ok: false, error: "This customer has no email address. Add one on their customer page." });

  if (b.status === "requested") {
    b = await db.updateTable("bookings").set({ status: "awaiting_payment", updated_at: new Date() }).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
  }
  const instalments = await db.selectFrom("instalments").selectAll().where("booking_id", "=", id).execute();
  const due = dueNow(b, instalments);
  if (due <= 0) return void res.status(400).json({ ok: false, error: "Nothing is due on this booking" });

  const sent = await sendEmail(paymentRequestEmail(b, customer, due));
  await addEvent(db, {
    booking_id: id,
    customer_id: b.customer_id,
    author: currentUser(res).name,
    body: sent ? `Payment request for ${formatINR(due)} emailed to ${customer.email}.` : `Payment request email to ${customer.email} FAILED to send.`,
  });
  if (!sent) return void res.status(502).json({ ok: false, error: "The email could not be sent. Check the email settings and try again." });
  await respondWithBooking(res, id);
});

bookingsAdminRouter.post("/:id/payments", canTakePayments, async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(
    z.object({
      amount: z.coerce.number().positive("Enter the amount received").max(10_000_000),
      method: z.enum(paymentMethods),
      note: z.string().trim().max(500).optional(),
      sendReceipt: z.boolean().default(true),
    }),
    req.body,
    res,
  );
  if (!id || !data) return;
  const booking = await recordManualPayment(id, { ...data, amount: Math.round(data.amount * 100), author: currentUser(res).name });
  if (!booking) return void res.status(404).json({ ok: false, error: "Booking not found" });
  await respondWithBooking(res, id);
});

/** Money given back after a cancellation. "Paid" stays what the customer paid; the refund is kept beside it. */
bookingsAdminRouter.post("/:id/refunds", canTakePayments, async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(
    z.object({
      amount: z.coerce.number().positive("Enter the amount refunded").max(10_000_000),
      method: z.enum(paymentMethods),
      note: z.string().trim().max(500).optional(),
      notifyCustomer: z.boolean().default(true),
    }),
    req.body,
    res,
  );
  if (!id || !data) return;
  const me = currentUser(res);
  const amount = Math.round(data.amount * 100);
  const result = await db.transaction().execute(async (trx) => {
    const b = await trx.selectFrom("bookings").selectAll().where("id", "=", id).forUpdate().executeTakeFirst();
    if (!b) return { ok: false, status: 404, message: "Booking not found" } as const;
    if (b.status !== "cancelled") return { ok: false, status: 400, message: "Cancel the booking first (Status), then record the refund." } as const;
    const refundable = b.amount_paid - b.refunded_amount;
    if (amount > refundable) {
      return { ok: false, status: 400, message: refundable > 0 ? `You can refund at most ${formatINR(refundable)} (paid ${formatINR(b.amount_paid)}, already refunded ${formatINR(b.refunded_amount)}).` : "Everything paid on this booking has already been refunded." } as const;
    }
    await trx
      .insertInto("payments")
      .values({ booking_id: id, provider: "manual", method: data.method, amount, status: "refunded", note: data.note ?? null, paid_at: new Date() })
      .execute();
    const updated = await trx
      .updateTable("bookings")
      .set({ refunded_amount: b.refunded_amount + amount, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
    const kept = updated.amount_paid - updated.refunded_amount;
    await addEvent(trx, {
      booking_id: id,
      customer_id: b.customer_id,
      author: me.name,
      body: `Refund of ${formatINR(amount)} recorded (${paymentMethodLabels[data.method]})${data.note ? `: ${data.note}` : ""}. ${kept > 0 ? `${formatINR(kept)} kept as cancellation charges.` : "Fully refunded."}`,
    });
    return { ok: true, booking: updated } as const;
  });
  if (!result.ok) return void res.status(result.status).json({ ok: false, error: result.message });
  if (data.notifyCustomer) {
    const customer = await db.selectFrom("customers").selectAll().where("id", "=", result.booking.customer_id).executeTakeFirstOrThrow();
    if (customer.email) {
      const sent = await sendEmail(refundEmail(result.booking, customer, amount, paymentMethodLabels[data.method]));
      await addEvent(db, { booking_id: id, customer_id: customer.id, body: sent ? `Refund confirmation emailed to ${customer.email}.` : `Refund email to ${customer.email} FAILED to send.` });
    }
  }
  await respondWithBooking(res, id);
});

bookingsAdminRouter.post("/:id/notes", canWriteNotes, async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(z.object({ body: z.string().trim().min(1).max(2000) }), req.body, res);
  if (!id || !data) return;
  const b = await db.selectFrom("bookings").select("id").where("id", "=", id).executeTakeFirst();
  if (!b) return void res.status(404).json({ ok: false, error: "Booking not found" });
  await db.insertInto("notes").values({ booking_id: id, kind: "note", body: data.body, author: currentUser(res).name }).execute();
  await respondWithBooking(res, id);
});

// ---------------- Instalment plan ----------------

/** Replaces the whole plan (the form edits it as one list). Amounts in rupees. */
bookingsAdminRouter.put("/:id/instalments", canTakePayments, async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(instalmentPlanSchema, req.body, res);
  if (!id || !data) return;
  const b = await db.selectFrom("bookings").select(["id", "customer_id", "total_amount", "tcs_amount"]).where("id", "=", id).executeTakeFirst();
  if (!b) return void res.status(404).json({ ok: false, error: "Booking not found" });
  const sum = data.instalments.reduce((s, i) => s + Math.round(i.amount * 100), 0);
  const owed = payable(b);
  if (owed !== null && sum > owed) {
    return void res.status(400).json({ ok: false, error: `The instalments add up to ${formatINR(sum)}, more than the ${formatINR(owed)} payable` });
  }
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("instalments").where("booking_id", "=", id).execute();
    if (data.instalments.length) {
      await trx
        .insertInto("instalments")
        .values(data.instalments.map((i) => ({ booking_id: id, label: i.label, due_date: i.dueDate, amount: Math.round(i.amount * 100) })))
        .execute();
    }
    await addEvent(trx, {
      booking_id: id,
      customer_id: b.customer_id,
      author: currentUser(res).name,
      body: data.instalments.length
        ? `Instalment plan set: ${data.instalments.map((i) => `${i.label} ₹${i.amount.toLocaleString("en-IN")} by ${formatDay(i.dueDate)}`).join("; ")}.`
        : "Instalment plan removed.",
    });
  });
  await respondWithBooking(res, id);
});

/** Emails a reminder for one instalment now. */
bookingsAdminRouter.post("/:id/instalments/:iid/remind", canTakePayments, async (req, res) => {
  const id = parseId(req.params.id);
  const iid = parseId(req.params.iid);
  if (!id || !iid) return void res.status(404).json({ ok: false, error: "Not found" });
  const b = await db.selectFrom("bookings").selectAll().where("id", "=", id).executeTakeFirst();
  if (!b) return void res.status(404).json({ ok: false, error: "Booking not found" });
  const customer = await db.selectFrom("customers").selectAll().where("id", "=", b.customer_id).executeTakeFirstOrThrow();
  if (!customer.email) return void res.status(400).json({ ok: false, error: "This customer has no email address. Send it on WhatsApp instead." });
  const plan = instalmentStates(await db.selectFrom("instalments").selectAll().where("booking_id", "=", id).execute(), b.amount_paid);
  const i = plan.find((x) => x.id === iid);
  if (!i) return void res.status(404).json({ ok: false, error: "Instalment not found" });
  if (i.state === "paid") return void res.status(400).json({ ok: false, error: "That instalment is already paid" });
  const sent = await sendEmail(instalmentReminderEmail(b, customer, { label: i.label, dueDate: i.dueDate, outstanding: i.amount - i.covered, overdue: i.state === "overdue" }));
  if (!sent) return void res.status(502).json({ ok: false, error: "The email could not be sent. Check the email settings and try again." });
  await db.updateTable("instalments").set({ reminder_sent_at: new Date() }).where("id", "=", iid).execute();
  await addEvent(db, { booking_id: id, customer_id: b.customer_id, author: currentUser(res).name, body: `Reminder for ${i.label} (${formatINR(i.amount - i.covered)}) emailed to ${customer.email}.` });
  await respondWithBooking(res, id);
});

// ---------------- Supplier costs (owner and accounts) ----------------

/** A cost goes to a supplier from the list, or a new supplier made from the name typed. */
bookingsAdminRouter.post("/:id/costs", canManageCosts, async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(costInputSchema, req.body, res);
  if (!id || !data) return;
  const b = await db.selectFrom("bookings").select(["id", "customer_id"]).where("id", "=", id).executeTakeFirst();
  if (!b) return void res.status(404).json({ ok: false, error: "Booking not found" });
  const supplier = data.supplierId
    ? await db.selectFrom("suppliers").select(["id", "name"]).where("id", "=", data.supplierId).executeTakeFirst()
    : await findOrCreateSupplier(data.supplierName!, supplierTypeForCost[data.category]);
  if (!supplier) return void res.status(400).json({ ok: false, error: "That supplier doesn't exist" });
  const amount = Math.round(data.amount * 100);
  await db
    .insertInto("booking_costs")
    .values({ booking_id: id, category: data.category, supplier_id: supplier.id, supplier: supplier.name, amount, note: data.note })
    .execute();
  const me = currentUser(res);
  await addEvent(db, { booking_id: id, customer_id: b.customer_id, author: me.name, body: `${me.name} added a cost: ${supplier.name} ${formatINR(amount)}.` });
  await respondWithBooking(res, id);
});

bookingsAdminRouter.delete("/:id/costs/:cid", canManageCosts, async (req, res) => {
  const id = parseId(req.params.id);
  const cid = parseId(req.params.cid);
  if (!id || !cid) return void res.status(404).json({ ok: false, error: "Not found" });
  const row = await db.deleteFrom("booking_costs").where("id", "=", cid).where("booking_id", "=", id).returning(["supplier", "amount"]).executeTakeFirst();
  if (row) {
    const b = await db.selectFrom("bookings").select("customer_id").where("id", "=", id).executeTakeFirstOrThrow();
    const me = currentUser(res);
    await addEvent(db, { booking_id: id, customer_id: b.customer_id, author: me.name, body: `${me.name} removed a cost: ${row.supplier} ${formatINR(row.amount)}.` });
  }
  await respondWithBooking(res, id);
});

// ---------------- Invoice ----------------

async function invoiceData(id: number): Promise<InvoiceData | null> {
  const b = await bookingsQuery().where("bookings.id", "=", id).executeTakeFirst();
  if (!b || b.total_amount === null) return null;
  const [settings, travellers, payments] = await Promise.all([
    getSettings(),
    db.selectFrom("travellers").select("full_name").where("booking_id", "=", id).orderBy("id").execute(),
    db.selectFrom("payments").selectAll().where("booking_id", "=", id).where("status", "=", "paid").orderBy("paid_at").execute(),
  ]);
  const gst = settings.gstin && settings.gstRate > 0 ? { rate: settings.gstRate, ...splitGst(b.total_amount, settings.gstRate) } : null;
  return {
    number: b.invoice_number,
    date: b.invoice_date,
    seller: { legalName: settings.legalName, address: settings.address, gstin: settings.gstin, bankDetails: settings.bankDetails, phone: site.phone, email: site.email },
    buyer: { name: b.customer_name, phone: b.customer_phone, email: b.customer_email },
    booking: {
      reference: b.reference,
      packageTitle: b.package_title,
      travelMonth: formatTravelMonth(b.travel_month),
      departure: b.departure_title && b.departure_start ? `${b.departure_title} (${formatDay(b.departure_start)})` : null,
      adults: b.adults,
      children: b.children,
    },
    travellers: travellers.map((t) => t.full_name),
    packagePrice: b.total_amount,
    gst,
    tcs: b.tcs_amount > 0 ? { rate: settings.tcsRate, amount: b.tcs_amount } : null,
    total: payable(b)!,
    paid: b.amount_paid,
    balance: balanceOf(b)!,
    payments: payments.map((p) => ({
      date: (p.paid_at ?? p.created_at).toISOString(),
      method: p.provider === "manual" ? (paymentMethodLabels[p.method as PaymentMethod] ?? p.method ?? "Other") : "Online",
      amount: p.amount,
      reference: p.provider_payment_id ?? p.note,
    })),
  };
}

bookingsAdminRouter.get("/:id/invoice", async (req, res) => {
  const id = parseId(req.params.id);
  const data = id && (await invoiceData(id));
  if (!data) return void res.status(404).json({ ok: false, error: "Set the booking's price before making an invoice" });
  res.json(data);
});

/** Gives the booking its invoice number: <prefix><financial year>/<running number>. */
bookingsAdminRouter.post("/:id/invoice", canTakePayments, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Booking not found" });
  const settings = await getSettings();
  const issued = await db.transaction().execute(async (trx) => {
    const b = await trx.selectFrom("bookings").select(["id", "customer_id", "invoice_number", "total_amount"]).where("id", "=", id).forUpdate().executeTakeFirst();
    if (!b || b.total_amount === null || b.invoice_number) return b;
    // One invoice number at a time, so two bookings never get the same one.
    await sql`select pg_advisory_xact_lock(7101)`.execute(trx);
    const today = todayIST();
    const series = `${settings.invoicePrefix}${financialYear(today)}/`;
    const last = await trx
      .selectFrom("bookings")
      .select("invoice_number")
      .where("invoice_number", "like", `${series.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
      .orderBy("invoice_number", "desc")
      .executeTakeFirst();
    const next = (Number(last?.invoice_number?.slice(series.length)) || 0) + 1;
    const number = `${series}${String(next).padStart(4, "0")}`;
    await trx.updateTable("bookings").set({ invoice_number: number, invoice_date: today }).where("id", "=", id).execute();
    await addEvent(trx, { booking_id: id, customer_id: b.customer_id, author: currentUser(res).name, body: `Invoice ${number} issued.` });
    return b;
  });
  if (!issued) return void res.status(404).json({ ok: false, error: "Booking not found" });
  if (issued.total_amount === null) return void res.status(400).json({ ok: false, error: "Set the booking's price before making an invoice" });
  res.json(await invoiceData(id));
});

// ---------------- Feedback ----------------

bookingsAdminRouter.post("/:id/feedback-request", canEditTrip, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Booking not found" });
  const b = await db.selectFrom("bookings").selectAll().where("id", "=", id).executeTakeFirst();
  if (!b) return void res.status(404).json({ ok: false, error: "Booking not found" });
  const customer = await db.selectFrom("customers").selectAll().where("id", "=", b.customer_id).executeTakeFirstOrThrow();
  if (!customer.email) return void res.status(400).json({ ok: false, error: "This customer has no email address. Send the feedback link on WhatsApp instead." });
  const sent = await sendFeedbackRequest(b, customer);
  if (!sent) return void res.status(502).json({ ok: false, error: "The email could not be sent. Check the email settings and try again." });
  await addEvent(db, { booking_id: id, customer_id: b.customer_id, author: currentUser(res).name, body: `Feedback request emailed to ${customer.email}.` });
  await respondWithBooking(res, id);
});

bookingsAdminRouter.use("/:id/travellers", travellersRouter);
