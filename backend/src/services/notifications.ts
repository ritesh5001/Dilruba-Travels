import type { StaffRole } from "@dilruba/shared/ops";
import { db } from "../db/index.ts";
import { ENV_OWNER_ID, envOwner } from "../lib/auth.ts";

// In-app alerts (the bell in the admin panel). Sent to people by role and/or by id; the main
// owner login (id 0) counts as an owner. Never throws: an alert must not fail the action.

type Target = { roles?: StaffRole[]; userIds?: (number | null | undefined)[] };

export async function notify(to: Target, n: { type: string; title: string; body?: string | null; link?: string | null }) {
  try {
    const ids = new Set<number>();
    for (const id of to.userIds ?? []) if (id !== null && id !== undefined) ids.add(id);
    if (to.roles?.length) {
      const rows = await db.selectFrom("users").select("id").where("role", "in", to.roles).where("active", "=", true).execute();
      for (const r of rows) ids.add(r.id);
      if (to.roles.includes("owner") && envOwner()) ids.add(ENV_OWNER_ID);
    }
    // Someone named directly may have been switched off since.
    const active = new Set((await db.selectFrom("users").select("id").where("active", "=", true).execute()).map((r) => r.id));
    const recipients = [...ids].filter((id) => id === ENV_OWNER_ID ? !!envOwner() : active.has(id));
    if (!recipients.length) return;
    await db
      .insertInto("notifications")
      .values(recipients.map((user_id) => ({ user_id, type: n.type, title: n.title.slice(0, 200), body: n.body?.slice(0, 500) ?? null, link: n.link ?? null })))
      .execute();
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

/** The people who supervise everything: owners and managers. */
export const SUPERVISORS: StaffRole[] = ["owner", "manager"];

/** Whoever looks after a lead: its assignee, or the supervisors when nobody is assigned. */
export async function leadOwner(leadId: number | null): Promise<Target> {
  const lead = leadId ? await db.selectFrom("leads").select("assigned_to").where("id", "=", leadId).executeTakeFirst() : undefined;
  return lead?.assigned_to ? { userIds: [lead.assigned_to] } : { roles: SUPERVISORS };
}

/** Read alerts older than this are tidied away by the background job. */
export async function pruneNotifications(days = 60) {
  await db
    .deleteFrom("notifications")
    .where("read_at", "is not", null)
    .where("created_at", "<", new Date(Date.now() - days * 864e5))
    .execute();
}
