import { leadStatuses } from "@dilruba/shared/booking";
import type { AdminLeadDetail, Paged, AdminLead } from "@dilruba/shared/crm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { accessToken, bookingReference, likePattern, PAGE_SIZE, pageParam, parseBody, parseId } from "../../lib/util.ts";
import { addEvent } from "../../services/crm.ts";
import { leadsQuery, toAdminLead, toAdminNote } from "./mappers.ts";

export const leadsRouter = Router();

leadsRouter.get("/", async (req, res) => {
  const page = pageParam(req.query.page);
  const status = leadStatuses.find((s) => s === req.query.status);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  let query = leadsQuery();
  if (status) query = query.where("leads.status", "=", status);
  if (q) {
    const pattern = likePattern(q);
    query = query.where((eb) =>
      eb.or([
        eb("customers.name", "ilike", pattern),
        eb("customers.phone", "ilike", pattern),
        eb("leads.package_name", "ilike", pattern),
        eb("leads.service", "ilike", pattern),
      ]),
    );
  }

  const [rows, count] = await Promise.all([
    query.orderBy("leads.created_at", "desc").limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE).execute(),
    query.clearSelect().select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
  ]);
  const body: Paged<AdminLead> = { items: rows.map(toAdminLead), total: Number(count.n), page, pageSize: PAGE_SIZE };
  res.json(body);
});

async function loadLead(id: number): Promise<AdminLeadDetail | null> {
  const row = await leadsQuery().where("leads.id", "=", id).executeTakeFirst();
  if (!row) return null;
  const [notes, bookings] = await Promise.all([
    db.selectFrom("notes").selectAll().where("lead_id", "=", id).orderBy("created_at", "desc").execute(),
    db.selectFrom("bookings").select(["id", "reference", "status"]).where("lead_id", "=", id).execute(),
  ]);
  return { ...toAdminLead(row), notes: notes.map(toAdminNote), bookings };
}

leadsRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const lead = id && (await loadLead(id));
  if (!lead) {
    res.status(404).json({ ok: false, error: "Lead not found" });
    return;
  }
  res.json(lead);
});

leadsRouter.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(z.object({ status: z.enum(leadStatuses) }), req.body, res);
  if (!id || !data) return;
  const before = await db.selectFrom("leads").select(["status", "customer_id"]).where("id", "=", id).executeTakeFirst();
  if (!before) {
    res.status(404).json({ ok: false, error: "Lead not found" });
    return;
  }
  if (before.status !== data.status) {
    await db.transaction().execute(async (trx) => {
      await trx.updateTable("leads").set({ status: data.status, updated_at: new Date() }).where("id", "=", id).execute();
      await addEvent(trx, { lead_id: id, body: `Status changed from ${before.status} to ${data.status}.` });
    });
  }
  res.json(await loadLead(id));
});

leadsRouter.post("/:id/notes", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(z.object({ body: z.string().trim().min(1).max(2000) }), req.body, res);
  if (!id || !data) return;
  const lead = await db.selectFrom("leads").select("customer_id").where("id", "=", id).executeTakeFirst();
  if (!lead) {
    res.status(404).json({ ok: false, error: "Lead not found" });
    return;
  }
  await db.insertInto("notes").values({ lead_id: id, kind: "note", body: data.body }).execute();
  res.json(await loadLead(id));
});

/** Turns an enquiry into a booking; staff then set the price and send the payment request. */
leadsRouter.post("/:id/convert", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Lead not found" });
  const lead = await db.selectFrom("leads").selectAll().where("id", "=", id).executeTakeFirst();
  if (!lead) return void res.status(404).json({ ok: false, error: "Lead not found" });

  const booking = await db.transaction().execute(async (trx) => {
    const booking = await trx
      .insertInto("bookings")
      .values({
        reference: bookingReference(),
        access_token: accessToken(),
        customer_id: lead.customer_id,
        lead_id: lead.id,
        package_title: lead.package_name ?? `${lead.service}${lead.option ? ` – ${lead.option}` : ""}`,
        travel_month: lead.travel_month,
        adults: lead.travellers ?? 1,
        children: 0,
        customer_notes: lead.message,
      })
      .returning(["id", "reference"])
      .executeTakeFirstOrThrow();
    await trx.updateTable("leads").set({ status: "converted", updated_at: new Date() }).where("id", "=", id).execute();
    await addEvent(trx, { lead_id: id, body: `Converted to booking ${booking.reference}.` });
    await addEvent(trx, { booking_id: booking.id, customer_id: lead.customer_id, body: `Created from enquiry #${id}.` });
    return booking;
  });
  res.status(201).json({ ok: true, bookingId: booking.id });
});
