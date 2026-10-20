import { enquirySchema } from "@dilruba/shared/enquiry";
import { Router } from "express";
import { db } from "../db/index.ts";
import { notifyAdmin } from "../email/send.ts";
import { adminNewLeadEmail } from "../email/templates.ts";
import { rateLimit } from "../lib/auth.ts";
import { parseBody } from "../lib/util.ts";
import { upsertCustomer } from "../services/crm.ts";

export const enquiryRouter = Router();

enquiryRouter.post(
  "/",
  rateLimit({ windowMs: 60 * 60_000, max: 20, message: "Too many enquiries. Please message us on WhatsApp instead." }),
  async (req, res) => {
    const data = parseBody(enquirySchema, req.body, res);
    if (!data) return;

    const { website, ...enquiry } = data;

    // Bots fill the hidden honeypot field; pretend success and drop it.
    if (website) {
      res.json({ ok: true });
      return;
    }

    const { lead, customer } = await db.transaction().execute(async (trx) => {
      const customer = await upsertCustomer(trx, { name: enquiry.name, phone: enquiry.phone });
      const lead = await trx
        .insertInto("leads")
        .values({
          customer_id: customer.id,
          service: enquiry.service,
          option: enquiry.option ?? null,
          package_name: enquiry.packageName ?? null,
          travel_month: enquiry.travelMonth ?? null,
          travellers: enquiry.travellers ?? null,
          message: enquiry.message ?? null,
          source: enquiry.source ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      return { lead, customer };
    });

    void notifyAdmin(adminNewLeadEmail(lead, customer));
    res.json({ ok: true });
  },
);
