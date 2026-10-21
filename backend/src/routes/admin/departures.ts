import type { AdminDepartureDetail } from "@dilruba/shared/crm";
import { departureInputSchema, todayIST, type AdminDeparture } from "@dilruba/shared/ops";
import { Router } from "express";
import { db } from "../../db/index.ts";
import { parseBody, parseId } from "../../lib/util.ts";
import { refreshWebsite } from "../../services/catalog.ts";
import { bookingsQuery, departuresQuery, documentsFor, toAdminBooking, toAdminDeparture, toAdminTraveller } from "./mappers.ts";

export const departuresRouter = Router();

/** ?when=past for finished trips; upcoming (from today) by default. */
departuresRouter.get("/", async (req, res) => {
  const today = todayIST();
  const past = req.query.when === "past";
  let query = departuresQuery();
  query = past ? query.where("departures.start_date", "<", today) : query.where("departures.start_date", ">=", today);
  const packageId = parseId(req.query.package);
  if (packageId) query = query.where("departures.package_id", "=", packageId);
  const rows = await query.orderBy("departures.start_date", past ? "desc" : "asc").limit(200).execute();
  const body: AdminDeparture[] = rows.map(toAdminDeparture);
  res.json(body);
});

async function loadDeparture(id: number): Promise<AdminDepartureDetail | null> {
  const row = await departuresQuery().where("departures.id", "=", id).executeTakeFirst();
  if (!row) return null;
  const [bookings, travellers] = await Promise.all([
    bookingsQuery().where("bookings.departure_id", "=", id).orderBy("bookings.created_at").execute(),
    db
      .selectFrom("travellers")
      .innerJoin("bookings", "bookings.id", "travellers.booking_id")
      .innerJoin("customers", "customers.id", "bookings.customer_id")
      .selectAll("travellers")
      .select(["bookings.reference", "customers.name as customer_name"])
      .where("bookings.departure_id", "=", id)
      .where("bookings.status", "!=", "cancelled")
      .orderBy("travellers.room_label")
      .orderBy("travellers.booking_id")
      .orderBy("travellers.id")
      .execute(),
  ]);
  const docs = await documentsFor(travellers.map((t) => t.id));
  return {
    ...toAdminDeparture(row),
    bookings: bookings.map(toAdminBooking),
    travellers: travellers.map((t) => ({ ...toAdminTraveller(t, docs.get(t.id)), reference: t.reference, customerName: t.customer_name })),
  };
}

departuresRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const d = id && (await loadDeparture(id));
  if (!d) return void res.status(404).json({ ok: false, error: "Departure not found" });
  res.json(d);
});

departuresRouter.post("/", async (req, res) => {
  const data = parseBody(departureInputSchema, req.body, res);
  if (!data) return;
  const row = await db
    .insertInto("departures")
    .values({ package_id: data.packageId, title: data.title, start_date: data.startDate, end_date: data.endDate, seats: data.seats, status: data.status, notes: data.notes })
    .returning("id")
    .executeTakeFirstOrThrow();
  void refreshWebsite();
  res.status(201).json(await loadDeparture(row.id));
});

departuresRouter.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(departureInputSchema, req.body, res);
  if (!id || !data) return;
  const row = await db
    .updateTable("departures")
    .set({ package_id: data.packageId, title: data.title, start_date: data.startDate, end_date: data.endDate, seats: data.seats, status: data.status, notes: data.notes, updated_at: new Date() })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!row) return void res.status(404).json({ ok: false, error: "Departure not found" });
  void refreshWebsite();
  res.json(await loadDeparture(id));
});

departuresRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Departure not found" });
  const used = await db.selectFrom("bookings").select("id").where("departure_id", "=", id).where("status", "!=", "cancelled").executeTakeFirst();
  if (used) return void res.status(409).json({ ok: false, error: "Bookings are on this departure. Move or cancel them first, or close the departure instead." });
  await db.deleteFrom("departures").where("id", "=", id).execute();
  void refreshWebsite();
  res.json({ ok: true });
});
