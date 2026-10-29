import type { AdminCustomer, AdminCustomerDetail, Paged } from "@dilruba/shared/crm";
import { phoneSchema } from "@dilruba/shared/booking";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { currentUser, requirePermission, userCan } from "../../lib/auth.ts";
import { likePattern, normalizePhone, PAGE_SIZE, pageParam, parseBody, parseId } from "../../lib/util.ts";
import { ensureReferralCode } from "../../services/crm.ts";
import { bookingsQuery, leadsQuery, toAdminBooking, toAdminLead, toAdminNote } from "./mappers.ts";

export const customersRouter = Router();

/** Sales see only the customers behind their own leads; other roles see everyone. */
const salesOnly = (res: import("express").Response) => userCan(res, "leads.read") && !userCan(res, "leads.all");

customersRouter.param("id", async (req, res, next, value) => {
  if (!salesOnly(res)) return next();
  const id = parseId(value);
  const mine = id && (await db.selectFrom("leads").select("id").where("customer_id", "=", id).where("assigned_to", "=", currentUser(res).id).executeTakeFirst());
  if (!mine) return void res.status(404).json({ ok: false, error: "Customer not found" });
  next();
});

customersRouter.get("/", async (req, res) => {
  const page = pageParam(req.query.page);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  let query = db.selectFrom("customers");
  if (salesOnly(res)) {
    const me = currentUser(res).id;
    query = query.where((eb) => eb.exists(eb.selectFrom("leads").select("leads.id").whereRef("leads.customer_id", "=", "customers.id").where("leads.assigned_to", "=", me)));
  }
  if (q) {
    const pattern = likePattern(q);
    query = query.where((eb) => eb.or([eb("name", "ilike", pattern), eb("phone", "ilike", pattern), eb("email", "ilike", pattern)]));
  }
  const [rows, count] = await Promise.all([
    query
      .selectAll("customers")
      .select((eb) => [
        eb.selectFrom("leads").whereRef("leads.customer_id", "=", "customers.id").select((s) => s.fn.countAll<number>().as("n")).as("lead_count"),
        eb.selectFrom("bookings").whereRef("bookings.customer_id", "=", "customers.id").select((s) => s.fn.countAll<number>().as("n")).as("booking_count"),
        eb
          .selectFrom("bookings")
          .whereRef("bookings.customer_id", "=", "customers.id")
          .select((s) => s.fn.coalesce(s.fn.sum<number>("bookings.amount_paid"), s.val(0)).as("n"))
          .as("total_paid"),
      ])
      .orderBy("customers.updated_at", "desc")
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .execute(),
    query.select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
  ]);

  const items: AdminCustomer[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    createdAt: r.created_at.toISOString(),
    leadCount: Number(r.lead_count ?? 0),
    bookingCount: Number(r.booking_count ?? 0),
    totalPaid: Number(r.total_paid ?? 0),
  }));
  const body: Paged<AdminCustomer> = { items, total: Number(count.n), page, pageSize: PAGE_SIZE };
  res.json(body);
});

async function loadCustomer(id: number): Promise<AdminCustomerDetail | null> {
  const c = await db.selectFrom("customers").selectAll().where("id", "=", id).executeTakeFirst();
  if (!c) return null;
  const [leads, bookings, notes, referrer, referrals] = await Promise.all([
    leadsQuery().where("leads.customer_id", "=", id).orderBy("leads.created_at", "desc").execute(),
    bookingsQuery().where("bookings.customer_id", "=", id).orderBy("bookings.created_at", "desc").execute(),
    db.selectFrom("notes").selectAll().where("customer_id", "=", id).where("kind", "=", "note").orderBy("created_at", "desc").execute(),
    c.referred_by ? db.selectFrom("customers").select(["id", "name"]).where("id", "=", c.referred_by).executeTakeFirst() : Promise.resolve(undefined),
    db.selectFrom("customers").select(["id", "name"]).where("referred_by", "=", id).orderBy("created_at", "desc").execute(),
  ]);
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    createdAt: c.created_at.toISOString(),
    referralCode: c.referral_code,
    referredBy: referrer ?? null,
    referrals,
    leads: leads.map(toAdminLead),
    bookings: bookings.map(toAdminBooking),
    notes: notes.map(toAdminNote),
  };
}

customersRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const customer = id && (await loadCustomer(id));
  if (!customer) return void res.status(404).json({ ok: false, error: "Customer not found" });
  res.json(customer);
});

/** Adds a customer by hand (owners and managers). One customer per phone number. */
customersRouter.post("/", requirePermission("leads.all"), async (req, res) => {
  const data = parseBody(
    z.object({
      name: z.string().trim().min(2, "Enter their name").max(80),
      phone: phoneSchema,
      email: z.union([z.email("Enter a valid email").trim().max(160), z.literal("")]).optional(),
    }),
    req.body,
    res,
  );
  if (!data) return;
  const phone = normalizePhone(data.phone);
  const existing = await db.selectFrom("customers").select(["id", "name"]).where("phone", "=", phone).executeTakeFirst();
  if (existing) return void res.status(409).json({ ok: false, error: `${phone} is already saved as ${existing.name}.`, id: existing.id });
  const me = currentUser(res);
  const row = await db
    .insertInto("customers")
    .values({ name: data.name, phone, email: data.email ? data.email.toLowerCase() : null })
    .returning("id")
    .executeTakeFirstOrThrow();
  await db.insertInto("notes").values({ customer_id: row.id, kind: "event", body: `Customer added by ${me.name}.`, author: me.name }).execute();
  res.status(201).json({ ok: true, id: row.id });
});

customersRouter.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(
    z.object({
      name: z.string().trim().min(2).max(80).optional(),
      email: z.union([z.email("Enter a valid email").trim().max(160), z.literal("")]).optional(),
    }),
    req.body,
    res,
  );
  if (!id || !data) return;
  const updated = await db
    .updateTable("customers")
    .set({ name: data.name, email: data.email === undefined ? undefined : data.email.toLowerCase() || null, updated_at: new Date() })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!updated) return void res.status(404).json({ ok: false, error: "Customer not found" });
  res.json(await loadCustomer(id));
});

customersRouter.post("/:id/notes", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(z.object({ body: z.string().trim().min(1).max(2000) }), req.body, res);
  if (!id || !data) return;
  const c = await db.selectFrom("customers").select("id").where("id", "=", id).executeTakeFirst();
  if (!c) return void res.status(404).json({ ok: false, error: "Customer not found" });
  await db.insertInto("notes").values({ customer_id: id, kind: "note", body: data.body, author: currentUser(res).name }).execute();
  res.json(await loadCustomer(id));
});

/** Gives the customer a referral code to share (if they don't have one yet). */
customersRouter.post("/:id/referral-code", async (req, res) => {
  const id = parseId(req.params.id);
  const c = id && (await db.selectFrom("customers").select("id").where("id", "=", id).executeTakeFirst());
  if (!c) return void res.status(404).json({ ok: false, error: "Customer not found" });
  await ensureReferralCode(c.id);
  res.json(await loadCustomer(c.id));
});

/**
 * Deletes a customer with their leads, quotes and notes (owners and managers only). Refused when
 * they have bookings, so payment and invoice history is never lost: cancel the bookings instead.
 */
customersRouter.delete("/:id", requirePermission("leads.all"), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Customer not found" });
  const bookings = await db.selectFrom("bookings").select((eb) => eb.fn.countAll<number>().as("n")).where("customer_id", "=", id).executeTakeFirstOrThrow();
  if (Number(bookings.n) > 0) {
    return void res.status(409).json({
      ok: false,
      error: `This customer has ${bookings.n} booking${Number(bookings.n) === 1 ? "" : "s"}, so they can't be deleted (their payment history must be kept). Cancel the bookings instead.`,
    });
  }
  const row = await db.deleteFrom("customers").where("id", "=", id).returning("name").executeTakeFirst();
  if (!row) return void res.status(404).json({ ok: false, error: "Customer not found" });
  console.info(`[customers] ${currentUser(res).name} deleted customer #${id} (${row.name})`);
  res.json({ ok: true });
});
