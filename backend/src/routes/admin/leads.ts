import { leadStatuses, leadStatusLabels, phoneSchema } from "@dilruba/shared/booking";
import type { AdminLeadDetail, Paged, AdminLead } from "@dilruba/shared/crm";
import { services } from "@dilruba/shared/enquiry";
import { Router } from "express";
import { sql } from "kysely";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { currentUser, userCan } from "../../lib/auth.ts";
import { accessToken, bookingReference, likePattern, PAGE_SIZE, pageParam, parseBody, parseId } from "../../lib/util.ts";
import { addEvent, upsertCustomer } from "../../services/crm.ts";
import { notify } from "../../services/notifications.ts";
import { leadsQuery, quotesQuery, toAdminLead, toAdminNote, toAdminQuote } from "./mappers.ts";

export const leadsRouter = Router();

// Sales (no "all leads" permission) only ever see and touch the leads assigned to them.
// Anyone else's lead looks like it doesn't exist.
leadsRouter.param("id", async (req, res, next, value) => {
  if (userCan(res, "leads.all")) return next();
  const id = parseId(value);
  const lead = id && (await db.selectFrom("leads").select("assigned_to").where("id", "=", id).executeTakeFirst());
  if (!lead || lead.assigned_to !== currentUser(res).id) return void res.status(404).json({ ok: false, error: "Lead not found" });
  next();
});

leadsRouter.get("/", async (req, res) => {
  const page = pageParam(req.query.page);
  const status = leadStatuses.find((s) => s === req.query.status);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const me = currentUser(res);

  let query = leadsQuery();
  if (!userCan(res, "leads.all")) query = query.where("leads.assigned_to", "=", me.id);
  if (status) query = query.where("leads.status", "=", status);
  // ?status=followup: every open lead whose follow-up date has arrived.
  if (req.query.status === "followup") query = query.where("leads.follow_up_at", "<=", sql<Date>`now()`).where("leads.status", "not in", ["converted", "lost"]);
  if (req.query.assigned === "me") query = query.where("leads.assigned_to", "=", me.id);
  if (req.query.assigned === "none") query = query.where("leads.assigned_to", "is", null);
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

  const order = req.query.status === "followup" ? query.orderBy("leads.follow_up_at") : query.orderBy("leads.created_at", "desc");
  const [rows, count] = await Promise.all([
    order.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE).execute(),
    query.clearSelect().select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
  ]);
  const body: Paged<AdminLead> = { items: rows.map(toAdminLead), total: Number(count.n), page, pageSize: PAGE_SIZE };
  res.json(body);
});

/** A lead taken by phone, WhatsApp or at the office. */
leadsRouter.post("/", async (req, res) => {
  const data = parseBody(
    z.object({
      name: z.string().trim().min(2, "Enter their name").max(80),
      phone: phoneSchema,
      email: z.union([z.email("Enter a valid email").trim().max(160), z.literal("")]).optional(),
      service: z.enum(services),
      packageName: z.string().trim().max(120).optional(),
      travelMonth: z.string().trim().max(20).optional(),
      travellers: z.coerce.number().int().min(1).max(99).optional(),
      message: z.string().trim().max(1000).optional(),
      source: z.string().trim().min(1).max(80),
      assignToMe: z.boolean().default(true),
    }),
    req.body,
    res,
  );
  if (!data) return;
  const me = currentUser(res);
  const lead = await db.transaction().execute(async (trx) => {
    const customer = await upsertCustomer(trx, { name: data.name, phone: data.phone, email: data.email || null });
    const lead = await trx
      .insertInto("leads")
      .values({
        customer_id: customer.id,
        service: data.service,
        package_name: data.packageName || null,
        travel_month: data.travelMonth || null,
        travellers: data.travellers ?? null,
        message: data.message || null,
        source: data.source,
        status: "contacted",
        // Sales always own the leads they add.
        assigned_to: (data.assignToMe || !userCan(res, "leads.all")) && me.id ? me.id : null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await addEvent(trx, { lead_id: lead.id, author: me.name, body: `Lead added by ${me.name} (${data.source}).` });
    return lead;
  });
  res.status(201).json({ ok: true, id: lead.id });
});

async function loadLead(id: number): Promise<AdminLeadDetail | null> {
  const row = await leadsQuery().where("leads.id", "=", id).executeTakeFirst();
  if (!row) return null;
  const [notes, bookings, quotes, referrer] = await Promise.all([
    db.selectFrom("notes").selectAll().where("lead_id", "=", id).orderBy("created_at", "desc").execute(),
    db.selectFrom("bookings").select(["id", "reference", "status"]).where("lead_id", "=", id).execute(),
    quotesQuery().where("quotes.lead_id", "=", id).orderBy("quotes.created_at", "desc").execute(),
    db
      .selectFrom("customers as c")
      .innerJoin("customers as r", "r.id", "c.referred_by")
      .select(["r.id", "r.name"])
      .where("c.id", "=", row.customer_id)
      .executeTakeFirst(),
  ]);
  return { ...toAdminLead(row), notes: notes.map(toAdminNote), bookings, quotes: quotes.map(toAdminQuote), referredBy: referrer ?? null };
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

const updateSchema = z.object({
  status: z.enum(leadStatuses).optional(),
  lostReason: z.string().trim().max(120).nullable().optional(),
  // ISO date-time, or null to clear.
  followUpAt: z.iso.datetime({ offset: true }).nullable().optional(),
  followUpNote: z.string().trim().max(300).nullable().optional(),
  assignedTo: z.coerce.number().int().positive().nullable().optional(),
});

leadsRouter.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(updateSchema, req.body, res);
  if (!id || !data) return;
  const me = currentUser(res);
  const before = await leadsQuery().where("leads.id", "=", id).executeTakeFirst();
  if (!before) {
    res.status(404).json({ ok: false, error: "Lead not found" });
    return;
  }
  if (data.status === "lost" && !data.lostReason && !before.lost_reason) {
    return void res.status(400).json({ ok: false, error: "Choose why this lead was lost" });
  }
  let assignee: { id: number; name: string } | null | undefined;
  if (data.assignedTo !== undefined && data.assignedTo !== before.assigned_to && !userCan(res, "leads.all")) {
    return void res.status(403).json({ ok: false, error: "Only managers can reassign leads" });
  }
  if (data.assignedTo !== undefined) {
    assignee = data.assignedTo === null ? null : ((await db.selectFrom("users").select(["id", "name"]).where("id", "=", data.assignedTo).where("active", "=", true).executeTakeFirst()) ?? undefined);
    if (assignee === undefined) return void res.status(400).json({ ok: false, error: "That staff member doesn't exist" });
  }

  const changes: string[] = [];
  const status = data.status ?? before.status;
  if (status !== before.status) changes.push(`status ${leadStatusLabels[before.status]} → ${leadStatusLabels[status]}`);
  // A lead that's no longer lost forgets the reason; a closed lead needs no follow-up.
  const lostReason = status === "lost" ? (data.lostReason ?? before.lost_reason) : null;
  if (lostReason && lostReason !== before.lost_reason) changes.push(`lost reason: ${lostReason}`);
  const closed = status === "lost" || status === "converted";
  const followUpAt = closed ? null : data.followUpAt === undefined ? before.follow_up_at : data.followUpAt ? new Date(data.followUpAt) : null;
  const followUpNote = closed ? null : data.followUpNote === undefined ? before.follow_up_note : data.followUpNote || null;
  if ((followUpAt?.getTime() ?? null) !== (before.follow_up_at?.getTime() ?? null)) {
    changes.push(followUpAt ? `follow-up set for ${followUpAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}` : "follow-up cleared");
  }
  if (assignee !== undefined && (assignee?.id ?? null) !== before.assigned_to) changes.push(assignee ? `assigned to ${assignee.name}` : "unassigned");

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("leads")
      .set({
        status,
        lost_reason: lostReason,
        follow_up_at: followUpAt,
        follow_up_note: followUpNote,
        assigned_to: assignee === undefined ? before.assigned_to : (assignee?.id ?? null),
        // A new follow-up date gets its own "due" alert.
        follow_up_notified_at: (followUpAt?.getTime() ?? null) === (before.follow_up_at?.getTime() ?? null) ? before.follow_up_notified_at : null,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .execute();
    if (changes.length) await addEvent(trx, { lead_id: id, author: me.name, body: `${me.name}: ${changes.join("; ")}.` });
  });
  if (assignee && assignee.id !== before.assigned_to && assignee.id !== me.id) {
    void notify(
      { userIds: [assignee.id] },
      { type: "lead", title: `${me.name} assigned you a lead: ${before.customer_name}`, body: before.package_name ?? before.service, link: `/admin/leads/${id}` },
    );
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
  await db.insertInto("notes").values({ lead_id: id, kind: "note", body: data.body, author: currentUser(res).name }).execute();
  res.json(await loadLead(id));
});

/** Turns an enquiry into a booking; staff then set the price and send the payment request. */
leadsRouter.post("/:id/convert", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Lead not found" });
  const lead = await db.selectFrom("leads").selectAll().where("id", "=", id).executeTakeFirst();
  if (!lead) return void res.status(404).json({ ok: false, error: "Lead not found" });
  const me = currentUser(res);

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
    await trx.updateTable("leads").set({ status: "converted", follow_up_at: null, follow_up_note: null, updated_at: new Date() }).where("id", "=", id).execute();
    await addEvent(trx, { lead_id: id, author: me.name, body: `Converted to booking ${booking.reference} by ${me.name}.` });
    await addEvent(trx, { booking_id: booking.id, customer_id: lead.customer_id, author: me.name, body: `Created from enquiry #${id}.` });
    return booking;
  });
  res.status(201).json({ ok: true, bookingId: booking.id });
});
