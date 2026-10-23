import { todayIST, type PublicDeparture } from "@dilruba/shared/ops";
import { Router } from "express";
import { db } from "../db/index.ts";
import { toTravelPackage } from "../services/catalog.ts";

export const catalogRouter = Router();

/**
 * Every published package, in display order, with its upcoming open departures and seats left.
 * The website caches this and builds its pages from it.
 */
catalogRouter.get("/catalog/packages", async (_req, res) => {
  const [rows, departures] = await Promise.all([
    db.selectFrom("packages").selectAll().where("published", "=", true).orderBy("sort_order").orderBy("id").execute(),
    db
      .selectFrom("departures")
      .select(["id", "package_id", "title", "start_date", "end_date", "seats"])
      .select((eb) =>
        eb
          .selectFrom("bookings")
          .whereRef("bookings.departure_id", "=", "departures.id")
          .where("bookings.status", "!=", "cancelled")
          .select((s) => s.fn.coalesce(s.fn.sum<number>(s("bookings.adults", "+", s.ref("bookings.children"))), s.val(0)).as("n"))
          .as("booked"),
      )
      .where("status", "=", "open")
      .where("package_id", "is not", null)
      .where("start_date", ">", todayIST())
      .orderBy("start_date")
      .execute(),
  ]);
  const byPackage = new Map<number, PublicDeparture[]>();
  for (const d of departures) {
    const list = byPackage.get(d.package_id!) ?? [];
    list.push({ id: d.id, title: d.title, startDate: d.start_date, endDate: d.end_date, seatsLeft: Math.max(0, d.seats - Number(d.booked ?? 0)) });
    byPackage.set(d.package_id!, list);
  }
  res.json({ packages: rows.map((r) => ({ ...toTravelPackage(r), departures: byPackage.get(r.id) })) });
});

/** Published reviews for the home page, in the order set in the admin panel. */
catalogRouter.get("/catalog/reviews", async (_req, res) => {
  const rows = await db
    .selectFrom("reviews")
    .select(["id", "name", "location", "trip", "rating", "body"])
    .where("published", "=", true)
    .orderBy("sort_order")
    .orderBy("created_at", "desc")
    .limit(30)
    .execute();
  res.json({ reviews: rows });
});

/** Uploaded images. An id's image never changes, so browsers and the CDN may keep it forever. */
catalogRouter.get("/media/:file", async (req, res) => {
  const match = /^(\d+)\.webp$/.exec(req.params.file);
  const media = match && (await db.selectFrom("media").select(["content_type", "data"]).where("id", "=", Number(match[1])).executeTakeFirst());
  if (!media) {
    res.status(404).json({ ok: false, error: "Image not found" });
    return;
  }
  res.setHeader("Content-Type", media.content_type);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(media.data);
});
