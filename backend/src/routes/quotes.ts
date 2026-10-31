import { downloadQuotePdf } from "../services/quote-pdf.ts";
import { getSettings } from "../services/settings.ts";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.ts";
import { notifyAdmin } from "../email/send.ts";
import { adminQuoteResponseEmail, bookingLink } from "../email/templates.ts";
import { rateLimit, safeEqual } from "../lib/auth.ts";
import { parseBody } from "../lib/util.ts";
import { addEvent } from "../services/crm.ts";
import { leadOwner, notify } from "../services/notifications.ts";
import { acceptQuote, effectiveStatus, toPublicQuote } from "../services/quotes.ts";

// The customer's quote page: view a quote from its secret link and accept or decline it.
export const quotesPublicRouter = Router();

async function findQuote(reference: unknown, token: unknown) {
  if (typeof reference !== "string" || typeof token !== "string" || !token) return null;
  const q = await db.selectFrom("quotes").selectAll().where("reference", "=", reference.toUpperCase()).executeTakeFirst();
  // Drafts aren't visible until staff send them.
  if (!q || q.status === "draft" || !safeEqual(q.access_token, token)) return null;
  return q;
}

quotesPublicRouter.get("/:reference", async (req, res) => {
  const q = await findQuote(req.params.reference, req.query.t);
  if (!q) return void res.status(404).json({ ok: false, error: "Quote not found. Please use the link we sent you." });
  const c = await db.selectFrom("customers").selectAll().where("id", "=", q.customer_id).executeTakeFirstOrThrow();
  res.json({ ok: true, quote: await toPublicQuote(q, c) });
});

quotesPublicRouter.get("/:reference/pdf", async (req, res) => {
  const q = await findQuote(req.params.reference, req.query.t);
  if (!q) return void res.status(404).json({ ok: false, error: "Quote not found" });
  const c = await db.selectFrom("customers").selectAll().where("id", "=", q.customer_id).executeTakeFirstOrThrow();
  await downloadQuotePdf(res, await toPublicQuote(q, c), await getSettings());
});

const respondSchema = z.object({ token: z.string().min(10).max(100), reason: z.string().trim().max(500).optional() });
const limiter = rateLimit({ windowMs: 15 * 60_000, max: 20, message: "Too many attempts. Please wait a few minutes." });

quotesPublicRouter.post("/:reference/accept", limiter, async (req, res) => {
  const data = parseBody(respondSchema, req.body, res);
  if (!data) return;
  const q = await findQuote(req.params.reference, data.token);
  if (!q) return void res.status(404).json({ ok: false, error: "Quote not found" });
  const status = effectiveStatus(q);
  if (status === "expired") return void res.status(409).json({ ok: false, error: "This quote has expired. Please contact us for an updated price." });
  if (status === "declined") return void res.status(409).json({ ok: false, error: "This quote was declined. Please contact us if you've changed your mind." });
  const bookingId = await acceptQuote(q.id, {});
  const b = await db.selectFrom("bookings").select(["reference", "access_token"]).where("id", "=", bookingId).executeTakeFirstOrThrow();
  res.json({ ok: true, bookingLink: bookingLink(b) });
});

quotesPublicRouter.post("/:reference/decline", limiter, async (req, res) => {
  const data = parseBody(respondSchema, req.body, res);
  if (!data) return;
  const q = await findQuote(req.params.reference, data.token);
  if (!q) return void res.status(404).json({ ok: false, error: "Quote not found" });
  if (q.status !== "sent") return void res.status(409).json({ ok: false, error: "This quote can't be declined now." });
  await db.updateTable("quotes").set({ status: "declined", responded_at: new Date(), updated_at: new Date() }).where("id", "=", q.id).execute();
  if (q.lead_id) await addEvent(db, { lead_id: q.lead_id, body: `Customer declined quote ${q.reference} online${data.reason ? `: "${data.reason}"` : "."}` });
  const c = await db.selectFrom("customers").selectAll().where("id", "=", q.customer_id).executeTakeFirstOrThrow();
  void notifyAdmin(adminQuoteResponseEmail(q, c, false, null));
  void leadOwner(q.lead_id).then((to) =>
    notify(to, { type: "quote", title: `Quote declined by ${c.name}`, body: `${q.reference} · ${q.title}${data.reason ? ` · "${data.reason}"` : ""}`, link: q.lead_id ? `/admin/leads/${q.lead_id}` : "/admin/quotes" }),
  );
  res.json({ ok: true });
});
