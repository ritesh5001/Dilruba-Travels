import type { Paged } from "@dilruba/shared/crm";
import { quoteInputSchema, quoteStatuses, type AdminQuote } from "@dilruba/shared/ops";
import { randomInt } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { sendEmail } from "../../email/send.ts";
import { quoteEmail } from "../../email/templates.ts";
import { currentUser } from "../../lib/auth.ts";
import { accessToken, likePattern, PAGE_SIZE, pageParam, parseBody, parseId } from "../../lib/util.ts";
import { addEvent } from "../../services/crm.ts";
import { acceptQuote, effectiveStatus } from "../../services/quotes.ts";
import { quotesQuery, toAdminQuote } from "./mappers.ts";

export const quotesRouter = Router();

// No 0/O/1/I/L, like booking references.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function quoteReference() {
  let ref = "Q";
  for (let i = 0; i < 6; i++) ref += ALPHABET[randomInt(ALPHABET.length)];
  return ref;
}

const toAdmin = (r: Parameters<typeof toAdminQuote>[0]): AdminQuote => ({ ...toAdminQuote(r), status: effectiveStatus(r) });

quotesRouter.get("/", async (req, res) => {
  const page = pageParam(req.query.page);
  const status = quoteStatuses.find((s) => s === req.query.status);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  let query = quotesQuery();
  if (status) query = query.where("quotes.status", "=", status);
  if (q) {
    const pattern = likePattern(q);
    query = query.where((eb) => eb.or([eb("quotes.reference", "ilike", pattern), eb("quotes.title", "ilike", pattern), eb("customers.name", "ilike", pattern), eb("customers.phone", "ilike", pattern)]));
  }
  const [rows, count] = await Promise.all([
    query.orderBy("quotes.created_at", "desc").limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE).execute(),
    query.clearSelect().select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
  ]);
  const body: Paged<AdminQuote> = { items: rows.map(toAdmin), total: Number(count.n), page, pageSize: PAGE_SIZE };
  res.json(body);
});

async function loadQuote(id: number) {
  const row = await quotesQuery().where("quotes.id", "=", id).executeTakeFirst();
  return row ? toAdmin(row) : null;
}

quotesRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const quote = id && (await loadQuote(id));
  if (!quote) return void res.status(404).json({ ok: false, error: "Quote not found" });
  res.json(quote);
});

function columns(d: z.output<typeof quoteInputSchema>) {
  return {
    lead_id: d.leadId ?? null,
    customer_id: d.customerId,
    package_id: d.packageId ?? null,
    departure_id: d.departureId ?? null,
    title: d.title,
    travel_month: d.travelMonth,
    adults: d.adults,
    children: d.children,
    items: JSON.stringify(d.items.map((i) => ({ label: i.label, quantity: i.quantity, unitPrice: Math.round(i.unitPrice * 100) }))),
    discount: Math.round(d.discount * 100),
    deposit: d.deposit == null ? null : Math.round(d.deposit * 100),
    inclusions: JSON.stringify(d.inclusions),
    message: d.message,
    valid_until: d.validUntil,
  };
}

quotesRouter.post("/", async (req, res) => {
  const data = parseBody(quoteInputSchema, req.body, res);
  if (!data) return;
  const customer = await db.selectFrom("customers").select("id").where("id", "=", data.customerId).executeTakeFirst();
  if (!customer) return void res.status(400).json({ ok: false, error: "Customer not found" });
  const me = currentUser(res);
  const row = await db
    .insertInto("quotes")
    .values({ ...columns(data), reference: quoteReference(), access_token: accessToken(), created_by: me.name })
    .returning(["id", "reference"])
    .executeTakeFirstOrThrow();
  if (data.leadId) await addEvent(db, { lead_id: data.leadId, author: me.name, body: `Quote ${row.reference} drafted by ${me.name}.` });
  res.status(201).json(await loadQuote(row.id));
});

quotesRouter.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(quoteInputSchema, req.body, res);
  if (!id || !data) return;
  const before = await db.selectFrom("quotes").select(["status", "booking_id"]).where("id", "=", id).executeTakeFirst();
  if (!before) return void res.status(404).json({ ok: false, error: "Quote not found" });
  if (before.booking_id) return void res.status(409).json({ ok: false, error: "This quote was accepted and is now a booking. Change the booking instead." });
  await db.updateTable("quotes").set({ ...columns(data), updated_at: new Date() }).where("id", "=", id).execute();
  res.json(await loadQuote(id));
});

/** Marks the quote sent; with email: true also emails it. The link can be shared on WhatsApp either way. */
quotesRouter.post("/:id/send", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(z.object({ email: z.boolean().default(true) }), req.body ?? {}, res);
  if (!id || !data) return;
  const q = await db.selectFrom("quotes").selectAll().where("id", "=", id).executeTakeFirst();
  if (!q) return void res.status(404).json({ ok: false, error: "Quote not found" });
  if (q.booking_id) return void res.status(409).json({ ok: false, error: "This quote is already a booking" });
  const me = currentUser(res);
  const customer = await db.selectFrom("customers").selectAll().where("id", "=", q.customer_id).executeTakeFirstOrThrow();
  if (data.email) {
    if (!customer.email) return void res.status(400).json({ ok: false, error: "This customer has no email. Share the quote link on WhatsApp instead." });
    const sent = await sendEmail(quoteEmail(q, customer));
    if (!sent) return void res.status(502).json({ ok: false, error: "The email could not be sent. Check the email settings and try again." });
  }
  await db.updateTable("quotes").set({ status: "sent", sent_at: new Date(), updated_at: new Date() }).where("id", "=", id).execute();
  if (q.lead_id) {
    await db.updateTable("leads").set({ status: "quoted", updated_at: new Date() }).where("id", "=", q.lead_id).where("status", "in", ["new", "contacted"]).execute();
    await addEvent(db, { lead_id: q.lead_id, author: me.name, body: `Quote ${q.reference} ${data.email ? `emailed to ${customer.email}` : "shared"} by ${me.name}.` });
  }
  res.json(await loadQuote(id));
});

/** The customer said yes by phone or WhatsApp: create the booking for them. */
quotesRouter.post("/:id/accept", async (req, res) => {
  const id = parseId(req.params.id);
  const q = id && (await db.selectFrom("quotes").select("id").where("id", "=", id).executeTakeFirst());
  if (!q) return void res.status(404).json({ ok: false, error: "Quote not found" });
  const bookingId = await acceptQuote(q.id, { staff: currentUser(res).name });
  res.json({ ok: true, bookingId });
});

quotesRouter.post("/:id/decline", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Quote not found" });
  const q = await db.selectFrom("quotes").select(["id", "reference", "lead_id", "booking_id"]).where("id", "=", id).executeTakeFirst();
  if (!q) return void res.status(404).json({ ok: false, error: "Quote not found" });
  if (q.booking_id) return void res.status(409).json({ ok: false, error: "This quote is already a booking" });
  await db.updateTable("quotes").set({ status: "declined", responded_at: new Date(), updated_at: new Date() }).where("id", "=", id).execute();
  const me = currentUser(res);
  if (q.lead_id) await addEvent(db, { lead_id: q.lead_id, author: me.name, body: `Quote ${q.reference} marked declined by ${me.name}.` });
  res.json(await loadQuote(id));
});

quotesRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Quote not found" });
  const row = await db.deleteFrom("quotes").where("id", "=", id).where("status", "=", "draft").returning("id").executeTakeFirst();
  if (!row) return void res.status(409).json({ ok: false, error: "Only draft quotes can be deleted" });
  res.json({ ok: true });
});
