import type { CostState, SupplierType } from "@dilruba/shared/ops";
import { sql } from "kysely";
import { db } from "../db/index.ts";

// What we owe each supplier. Payments to a supplier go towards their costs oldest first (the
// same way customer payments cover instalments), which gives every cost a paid / part paid /
// unpaid state without staff having to match each payment to a cost by hand.

export type CostAllocation = { covered: number; state: CostState };
export type SupplierTotals = { totalCosts: number; totalPaid: number; owed: number; costCount: number };

export async function supplierLedger(supplierIds: number[]) {
  const costs = new Map<number, CostAllocation>();
  const totals = new Map<number, SupplierTotals>();
  const ids = [...new Set(supplierIds)];
  if (!ids.length) return { costs, totals };

  const [costRows, paidRows] = await Promise.all([
    db.selectFrom("booking_costs").select(["id", "supplier_id", "amount"]).where("supplier_id", "in", ids).orderBy("created_at").orderBy("id").execute(),
    db
      .selectFrom("supplier_payments")
      .select("supplier_id")
      .select((eb) => eb.fn.sum<number>("amount").as("paid"))
      .where("supplier_id", "in", ids)
      .where("voided_at", "is", null)
      .groupBy("supplier_id")
      .execute(),
  ]);
  const paid = new Map(paidRows.map((r) => [r.supplier_id, Number(r.paid)]));
  for (const id of ids) totals.set(id, { totalCosts: 0, totalPaid: paid.get(id) ?? 0, owed: 0, costCount: 0 });

  const left = new Map(paid);
  for (const c of costRows) {
    const sid = c.supplier_id!;
    const t = totals.get(sid)!;
    t.totalCosts += c.amount;
    t.costCount += 1;
    const available = left.get(sid) ?? 0;
    const covered = Math.min(c.amount, Math.max(0, available));
    left.set(sid, available - covered);
    costs.set(c.id, { covered, state: covered >= c.amount ? "paid" : covered > 0 ? "part_paid" : "unpaid" });
  }
  for (const t of totals.values()) t.owed = Math.max(0, t.totalCosts - t.totalPaid);
  return { costs, totals };
}

/** Finds a supplier by name (any case) or adds it, so typing a known name never makes a duplicate. */
export async function findOrCreateSupplier(name: string, type: SupplierType) {
  const clean = name.trim().replace(/\s+/g, " ");
  const existing = await db.selectFrom("suppliers").select(["id", "name"]).where((eb) => eb(eb.fn("lower", ["name"]), "=", clean.toLowerCase())).executeTakeFirst();
  if (existing) return existing;
  return db
    .insertInto("suppliers")
    .values({ name: clean, type })
    // Two people adding the same new name at once still end up with one supplier.
    .onConflict((oc) => oc.expression(sql`lower(name)`).doUpdateSet({ updated_at: new Date() }))
    .returning(["id", "name"])
    .executeTakeFirstOrThrow();
}
