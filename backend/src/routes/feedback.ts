import { feedbackInputSchema, type PublicFeedbackInfo } from "@dilruba/shared/ops";
import { Router } from "express";
import { db } from "../db/index.ts";
import { notifyAdmin } from "../email/send.ts";
import { adminFeedbackEmail } from "../email/templates.ts";
import { rateLimit, safeEqual } from "../lib/auth.ts";
import { parseBody } from "../lib/util.ts";
import { addEvent } from "../services/crm.ts";
import { getSettings } from "../services/settings.ts";

// After the trip: the customer rates it from the link in their email. Happy customers are then
// invited to post a Google review; anyone less happy goes straight to the owner instead.
export const feedbackRouter = Router();

async function findBooking(reference: unknown, token: unknown) {
  if (typeof reference !== "string" || typeof token !== "string" || !token) return null;
  const b = await db.selectFrom("bookings").selectAll().where("reference", "=", reference.toUpperCase()).executeTakeFirst();
  return b && safeEqual(b.access_token, token) ? b : null;
}

feedbackRouter.get("/:reference", async (req, res) => {
  const b = await findBooking(req.params.reference, req.query.t);
  if (!b) return void res.status(404).json({ ok: false, error: "We couldn't find this trip. Please use the link from your email." });
  const [c, existing, settings] = await Promise.all([
    db.selectFrom("customers").select("name").where("id", "=", b.customer_id).executeTakeFirstOrThrow(),
    db.selectFrom("feedback").select("rating").where("booking_id", "=", b.id).executeTakeFirst(),
    getSettings(),
  ]);
  const body: PublicFeedbackInfo = {
    reference: b.reference,
    name: c.name,
    packageTitle: b.package_title,
    submitted: !!existing,
    googleReviewUrl: existing && existing.rating >= 4 ? settings.googleReviewUrl || null : null,
  };
  res.json({ ok: true, info: body });
});

feedbackRouter.post(
  "/:reference",
  rateLimit({ windowMs: 60 * 60_000, max: 10, message: "Too many attempts. Please try again later." }),
  async (req, res) => {
    const data = parseBody(feedbackInputSchema, req.body, res);
    if (!data) return;
    const b = await findBooking(req.params.reference, data.token);
    if (!b) return void res.status(404).json({ ok: false, error: "Trip not found" });
    const saved = await db
      .insertInto("feedback")
      .values({ booking_id: b.id, rating: data.rating, comment: data.comment })
      .onConflict((oc) => oc.column("booking_id").doNothing())
      .returning("id")
      .executeTakeFirst();
    if (!saved) return void res.status(409).json({ ok: false, error: "You've already shared feedback for this trip. JazakAllah Khair!" });
    await addEvent(db, { booking_id: b.id, customer_id: b.customer_id, body: `Customer rated the trip ${data.rating}/5${data.comment ? `: "${data.comment}"` : "."}` });
    const c = await db.selectFrom("customers").selectAll().where("id", "=", b.customer_id).executeTakeFirstOrThrow();
    void notifyAdmin(adminFeedbackEmail(b, c, data.rating, data.comment));
    const settings = await getSettings();
    res.json({ ok: true, googleReviewUrl: data.rating >= 4 ? settings.googleReviewUrl || null : null });
  },
);
