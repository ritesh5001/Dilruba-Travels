import { hotelInputSchema, type AdminHotel } from "@dilruba/shared/ops";
import { Router } from "express";
import { db } from "../../db/index.ts";
import type { HotelTable } from "../../db/schema.ts";
import { parseBody, parseId } from "../../lib/util.ts";

// Makkah and Madinah hotels, picked from when writing a quote. Quotes keep their own copy of
// the hotel, so editing or deleting one here never changes a quote already sent.
export const hotelsRouter = Router();

const toHotel = (h: Pick<HotelTable, "city" | "name" | "detail"> & { id: number }): AdminHotel => ({ id: h.id, city: h.city, name: h.name, detail: h.detail });
const columns = ["id", "city", "name", "detail"] as const;

hotelsRouter.get("/", async (_req, res) => {
  const rows = await db.selectFrom("hotels").select(columns).orderBy("city").orderBy("name").execute();
  res.json(rows.map(toHotel));
});

hotelsRouter.post("/", async (req, res) => {
  const data = parseBody(hotelInputSchema, req.body, res);
  if (!data) return;
  const row = await db.insertInto("hotels").values({ city: data.city, name: data.name, detail: data.detail }).returning(columns).executeTakeFirstOrThrow();
  res.status(201).json(toHotel(row));
});

hotelsRouter.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(hotelInputSchema, req.body, res);
  if (!id || !data) return;
  const row = await db.updateTable("hotels").set({ city: data.city, name: data.name, detail: data.detail }).where("id", "=", id).returning(columns).executeTakeFirst();
  if (!row) return void res.status(404).json({ ok: false, error: "Hotel not found" });
  res.json(toHotel(row));
});

hotelsRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Hotel not found" });
  const row = await db.deleteFrom("hotels").where("id", "=", id).returning("id").executeTakeFirst();
  if (!row) return void res.status(404).json({ ok: false, error: "Hotel not found" });
  res.json({ ok: true });
});
