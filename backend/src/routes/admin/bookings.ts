import { bookingStatuses, bookingStatusLabels, formatINR, paymentMethods } from "@dilruba/shared/booking";
import type { AdminBooking, AdminBookingDetail, Paged } from "@dilruba/shared/crm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { sendEmail } from "../../email/send.ts";
import { bookingLink, paymentRequestEmail } from "../../email/templates.ts";
import { likePattern, PAGE_SIZE, pageParam, parseBody, parseId } from "../../lib/util.ts";
import { paymentProvider } from "../../payments/index.ts";
import { addEvent, dueNow, recordManualPayment, sendStatusEmail } from "../../services/crm.ts";
import { bookingsQuery, toAdminBooking, toAdminNote, toAdminPayment } from "./mappers.ts";

export const bookingsAdminRouter = Router();

bookingsAdminRouter.get("/", async (req, res) => {
  const page = pageParam(req.query.page);
  const status = bookingStatuses.find((s) => s === req.query.status);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  let query = bookingsQuery();
  if (status) query = query.where("bookings.status", "=", status);
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

async function loadBooking(id: number): Promise<AdminBookingDetail | null> {
  const row = await bookingsQuery().where("bookings.id", "=", id).executeTakeFirst();
  if (!row) return null;
  const [payments, notes] = await Promise.all([
    db.selectFrom("payments").selectAll().where("booking_id", "=", id).where("status", "!=", "created").orderBy("created_at", "desc").execute(),
    db.selectFrom("notes").selectAll().where("booking_id", "=", id).orderBy("created_at", "desc").execute(),
  ]);
  return {
    ...toAdminBooking(row),
    packageCategory: row.package_category,
    packageSlug: row.package_slug,
    customerNotes: row.customer_notes,
    leadId: row.lead_id,
    dueNow: dueNow(row),
    customerLink: bookingLink(row),
    onlinePaymentsEnabled: paymentProvider !== null,
    payments: payments.map(toAdminPayment),
    notes: notes.map(toAdminNote),
  };
}

async function respondWithBooking(res: import("express").Response, id: number) {
  const booking = await loadBooking(id);
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
    packageTitle: z.string().trim().min(1).max(160).optional(),
    travelMonth: z.string().trim().regex(/^\d{4}-\d{2}$/).nullable().optional(),
    adults: z.coerce.number().int().min(1).max(50).optional(),
    children: z.coerce.number().int().min(0).max(50).optional(),
    notifyCustomer: z.boolean().default(true),
  })
  .refine((d) => d.depositAmount == null || d.totalAmount == null || d.depositAmount <= d.totalAmount, {
    message: "The deposit can't be more than the total price",
  });

const toPaise = (rupee: number | null | undefined) => (rupee == null ? rupee : Math.round(rupee * 100));

bookingsAdminRouter.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(updateSchema, req.body, res);
  if (!id || !data) return;
  const before = await db.selectFrom("bookings").selectAll().where("id", "=", id).executeTakeFirst();
  if (!before) return void res.status(404).json({ ok: false, error: "Booking not found" });

  const total = data.totalAmount === undefined ? before.total_amount : toPaise(data.totalAmount)!;
  const deposit = data.depositAmount === undefined ? before.deposit_amount : toPaise(data.depositAmount)!;
  if (deposit !== null && total !== null && deposit > total) {
    return void res.status(400).json({ ok: false, error: "The deposit can't be more than the total price" });
  }

  const updated = await db.transaction().execute(async (trx) => {
    const b = await trx
      .updateTable("bookings")
      .set({
        status: data.status,
        total_amount: total,
        deposit_amount: deposit,
        package_title: data.packageTitle,
        travel_month: data.travelMonth,
        adults: data.adults,
        children: data.children,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    const changes: string[] = [];
    if (b.status !== before.status) changes.push(`status ${bookingStatusLabels[before.status]} → ${bookingStatusLabels[b.status]}`);
    if (b.total_amount !== before.total_amount) changes.push(`total ${formatINR(before.total_amount)} → ${formatINR(b.total_amount)}`);
    if (b.deposit_amount !== before.deposit_amount) changes.push(`deposit ${formatINR(before.deposit_amount)} → ${formatINR(b.deposit_amount)}`);
    if (b.package_title !== before.package_title) changes.push(`package → ${b.package_title}`);
    if (b.travel_month !== before.travel_month) changes.push(`travel month → ${b.travel_month ?? "flexible"}`);
    if (b.adults !== before.adults || b.children !== before.children) changes.push(`travellers → ${b.adults} adults, ${b.children} children`);
    if (changes.length) await addEvent(trx, { booking_id: id, customer_id: b.customer_id, body: `Updated: ${changes.join("; ")}.` });
    return b;
  });

  if (updated.status !== before.status && data.notifyCustomer) {
    const sent = await sendStatusEmail(updated);
    if (sent) await addEvent(db, { booking_id: id, customer_id: updated.customer_id, body: `Emailed customer: booking ${updated.status}.` });
  }
  await respondWithBooking(res, id);
});

/** Emails the customer their price and a link to pay online. */
bookingsAdminRouter.post("/:id/payment-request", async (req, res) => {
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
  const due = dueNow(b);
  if (due <= 0) return void res.status(400).json({ ok: false, error: "Nothing is due on this booking" });

  const sent = await sendEmail(paymentRequestEmail(b, customer, due));
  await addEvent(db, {
    booking_id: id,
    customer_id: b.customer_id,
    body: sent ? `Payment request for ${formatINR(due)} emailed to ${customer.email}.` : `Payment request email to ${customer.email} FAILED to send.`,
  });
  if (!sent) return void res.status(502).json({ ok: false, error: "The email could not be sent. Check the email settings and try again." });
  await respondWithBooking(res, id);
});

bookingsAdminRouter.post("/:id/payments", async (req, res) => {
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
  const booking = await recordManualPayment(id, { ...data, amount: Math.round(data.amount * 100) });
  if (!booking) return void res.status(404).json({ ok: false, error: "Booking not found" });
  await respondWithBooking(res, id);
});

bookingsAdminRouter.post("/:id/notes", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(z.object({ body: z.string().trim().min(1).max(2000) }), req.body, res);
  if (!id || !data) return;
  const b = await db.selectFrom("bookings").select("id").where("id", "=", id).executeTakeFirst();
  if (!b) return void res.status(404).json({ ok: false, error: "Booking not found" });
  await db.insertInto("notes").values({ booking_id: id, kind: "note", body: data.body }).execute();
  await respondWithBooking(res, id);
});
