import { reviewInputSchema, type AdminReview } from "@dilruba/shared/ops";
import { Router } from "express";
import { db } from "../../db/index.ts";
import type { Review } from "../../db/schema.ts";
import { parseBody, parseId } from "../../lib/util.ts";
import { refreshWebsite } from "../../services/catalog.ts";

// Reviews shown on the home page. Every change refreshes the website.
export const reviewsRouter = Router();

const toAdminReview = (r: Review): AdminReview => ({
  id: r.id,
  name: r.name,
  location: r.location,
  trip: r.trip,
  rating: r.rating,
  body: r.body,
  published: r.published,
  sortOrder: r.sort_order,
  fromFeedback: r.feedback_id !== null,
  createdAt: r.created_at.toISOString(),
});

reviewsRouter.get("/", async (_req, res) => {
  const rows = await db.selectFrom("reviews").selectAll().orderBy("published", "desc").orderBy("sort_order").orderBy("created_at", "desc").execute();
  res.json(rows.map(toAdminReview));
});

function columns(d: ReturnType<typeof reviewInputSchema.parse>) {
  return { name: d.name, location: d.location, trip: d.trip, rating: d.rating, body: d.body, published: d.published, sort_order: d.sortOrder };
}

reviewsRouter.post("/", async (req, res) => {
  const data = parseBody(reviewInputSchema, req.body, res);
  if (!data) return;
  const row = await db.insertInto("reviews").values(columns(data)).returningAll().executeTakeFirstOrThrow();
  void refreshWebsite();
  res.status(201).json(toAdminReview(row));
});

reviewsRouter.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(reviewInputSchema, req.body, res);
  if (!id || !data) return;
  const row = await db.updateTable("reviews").set({ ...columns(data), updated_at: new Date() }).where("id", "=", id).returningAll().executeTakeFirst();
  if (!row) return void res.status(404).json({ ok: false, error: "Review not found" });
  void refreshWebsite();
  res.json(toAdminReview(row));
});

reviewsRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const row = id && (await db.deleteFrom("reviews").where("id", "=", id).returning("id").executeTakeFirst());
  if (!row) return void res.status(404).json({ ok: false, error: "Review not found" });
  void refreshWebsite();
  res.json({ ok: true });
});

/**
 * Turns a booking's feedback into a review draft (hidden until staff check and publish it):
 * first name and last initial, the trip, the rating and their comment.
 */
reviewsRouter.post("/from-feedback/:bookingId", async (req, res) => {
  const bookingId = parseId(req.params.bookingId);
  const fb =
    bookingId &&
    (await db
      .selectFrom("feedback")
      .innerJoin("bookings", "bookings.id", "feedback.booking_id")
      .innerJoin("customers", "customers.id", "bookings.customer_id")
      .select(["feedback.id", "feedback.rating", "feedback.comment", "feedback.can_publish", "bookings.package_title", "customers.name"])
      .where("feedback.booking_id", "=", bookingId)
      .executeTakeFirst());
  if (!fb) return void res.status(404).json({ ok: false, error: "This booking has no feedback yet" });
  if (!fb.can_publish) return void res.status(409).json({ ok: false, error: "The customer didn't agree to their review being shown on the website. Ask them first, then add it by hand." });
  if (!fb.comment || fb.comment.length < 10) return void res.status(400).json({ ok: false, error: "The customer only left a rating, so there's no text to show" });
  const existing = await db.selectFrom("reviews").select("id").where("feedback_id", "=", fb.id).executeTakeFirst();
  if (existing) return void res.json({ ok: true, id: existing.id });
  const [first, ...rest] = fb.name.trim().split(/\s+/);
  const name = rest.length ? `${first} ${rest[rest.length - 1]![0]!.toUpperCase()}.` : first!;
  const row = await db
    .insertInto("reviews")
    .values({ name, trip: fb.package_title.slice(0, 80), rating: fb.rating, body: fb.comment.slice(0, 600), published: false, feedback_id: fb.id })
    .returning("id")
    .executeTakeFirstOrThrow();
  res.status(201).json({ ok: true, id: row.id });
});
