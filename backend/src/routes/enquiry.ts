import { enquirySchema } from "@dilruba/shared/enquiry";
import { Router } from "express";
import { db } from "../db/index.ts";
import { notifyAdmin } from "../email/send.ts";
import { adminNewLeadEmail } from "../email/templates.ts";
import { rateLimit } from "../lib/auth.ts";
import { parseBody } from "../lib/util.ts";
import { addEvent, applyReferral, upsertCustomer } from "../services/crm.ts";
import { acknowledgeLead, pickAssignee } from "../services/leads.ts";
import { notify, SUPERVISORS } from "../services/notifications.ts";
import { getSettings } from "../services/settings.ts";

export const enquiryRouter = Router();

enquiryRouter.post(
  "/",
  rateLimit({ windowMs: 60 * 60_000, max: 20, message: "Too many enquiries. Please message us on WhatsApp instead." }),
  async (req, res) => {
    const data = parseBody(enquirySchema, req.body, res);
    if (!data) return;

    const { website, referralCode, ...enquiry } = data;

    // Bots fill the hidden honeypot field; pretend success and drop it.
    if (website) {
      res.json({ ok: true });
      return;
    }

    // Read before the transaction: every query inside it goes through trx.
    const settings = await getSettings();
    const { lead, customer, assignee } = await db.transaction().execute(async (trx) => {
      const customer = await upsertCustomer(trx, { name: enquiry.name, phone: enquiry.phone, email: enquiry.email ?? null });
      const referrer = await applyReferral(trx, customer.id, referralCode);
      const assignee = await pickAssignee(trx, customer.id, settings.autoAssignLeads);
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
          assigned_to: assignee?.id ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      if (referrer) await addEvent(trx, { lead_id: lead.id, body: `Referred by ${referrer.name} (code ${referralCode!.toUpperCase()}).` });
      if (assignee) await addEvent(trx, { lead_id: lead.id, body: `Automatically assigned to ${assignee.name}.` });
      return { lead, customer, assignee };
    });

    const what = lead.package_name ?? lead.service;
    void notifyAdmin(adminNewLeadEmail(lead, customer));
    void notify(assignee ? { userIds: [assignee.id] } : { roles: SUPERVISORS }, {
      type: "lead",
      title: assignee ? `New lead for you: ${customer.name}` : `New unassigned lead: ${customer.name}`,
      body: `${what}${lead.source ? ` · ${lead.source}` : ""}`,
      link: `/admin/leads/${lead.id}`,
    });
    void acknowledgeLead(lead, customer, assignee).catch((err: unknown) => console.error("[ack] failed:", err));
    res.json({ ok: true });
  },
);
