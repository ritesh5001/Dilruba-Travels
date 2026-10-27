import type { Transaction } from "kysely";
import { sql } from "kysely";
import { db } from "../db/index.ts";
import type { Customer, Database, Lead } from "../db/schema.ts";
import { sendEmail } from "../email/send.ts";
import { enquiryAckEmail } from "../email/templates.ts";
import { addEvent } from "./crm.ts";
import { getSettings } from "./settings.ts";

type Executor = typeof db | Transaction<Database>;

/**
 * Who a new website lead goes to (when auto-assignment is on):
 *  1. whoever handled this customer's last lead, if they're still active (a familiar voice);
 *  2. otherwise the active Sales person with the fewest open leads (Managers if there are no
 *     Sales staff), the longest-waiting first on a tie.
 */
export async function pickAssignee(trx: Executor, customerId: number, enabled: boolean): Promise<{ id: number; name: string } | null> {
  // `enabled` comes from the settings, read by the caller before its transaction.
  if (!enabled) return null;

  const previous = await trx
    .selectFrom("leads")
    .innerJoin("users", "users.id", "leads.assigned_to")
    .select(["users.id", "users.name"])
    .where("leads.customer_id", "=", customerId)
    .where("users.active", "=", true)
    .where("users.role", "in", ["sales", "manager", "owner"])
    .orderBy("leads.created_at", "desc")
    .executeTakeFirst();
  if (previous) return previous;

  for (const role of ["sales", "manager"] as const) {
    const next = await trx
      .selectFrom("users")
      .select(["users.id", "users.name"])
      .select((eb) =>
        eb
          .selectFrom("leads")
          .whereRef("leads.assigned_to", "=", "users.id")
          .where("leads.status", "not in", ["converted", "lost"])
          .select((s) => s.fn.countAll<number>().as("n"))
          .as("open_leads"),
      )
      .select((eb) => eb.selectFrom("leads").whereRef("leads.assigned_to", "=", "users.id").select((s) => s.fn.max("leads.created_at").as("m")).as("last_assigned"))
      .where("users.role", "=", role)
      .where("users.active", "=", true)
      .orderBy("open_leads")
      .orderBy(sql`last_assigned nulls first`)
      .orderBy("users.id")
      .executeTakeFirst();
    if (next) return { id: next.id, name: next.name };
  }
  return null;
}

/** Thanks the customer by email straight away (when enabled and they gave an email); logged on the lead. */
export async function acknowledgeLead(lead: Lead, customer: Customer, assignee: { name: string } | null) {
  if (!(await getSettings()).autoAcknowledge) return;
  if (customer.email) {
    const sent = await sendEmail(enquiryAckEmail(lead, customer, assignee?.name ?? null));
    await addEvent(db, { lead_id: lead.id, body: sent ? `Acknowledgement emailed to ${customer.email}.` : `Acknowledgement email to ${customer.email} FAILED to send.` });
  }
}
