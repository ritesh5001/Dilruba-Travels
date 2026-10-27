import { supplierInputSchema, supplierPaymentSchema, todayIST, type AdminSupplier, type AdminSupplierDetail, type SupplierPayment } from "@dilruba/shared/ops";
import { formatINR } from "@dilruba/shared/booking";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.ts";
import type { Supplier, SupplierPaymentRow } from "../../db/schema.ts";
import { currentUser } from "../../lib/auth.ts";
import { parseBody, parseId } from "../../lib/util.ts";
import { supplierLedger, type SupplierTotals } from "../../services/suppliers.ts";
import { toAdminCost } from "./mappers.ts";

// Suppliers (owner and accounts): who we buy hotels, flights, visas and transport from, what
// each booking costs us with them, what we've paid and what we still owe.
export const suppliersRouter = Router();

const empty: SupplierTotals = { totalCosts: 0, totalPaid: 0, owed: 0, costCount: 0 };

const toAdminSupplier = (s: Supplier, t: SupplierTotals = empty): AdminSupplier => ({
  id: s.id,
  name: s.name,
  type: s.type,
  contactPerson: s.contact_person,
  phone: s.phone,
  email: s.email,
  notes: s.notes,
  active: s.active,
  ...t,
});

const toPayment = (p: SupplierPaymentRow): SupplierPayment => ({
  id: p.id,
  amount: p.amount,
  paidOn: p.paid_on,
  method: p.method,
  reference: p.reference,
  note: p.note,
  createdBy: p.created_by,
  createdAt: p.created_at.toISOString(),
  voidedAt: p.voided_at?.toISOString() ?? null,
  voidReason: p.void_reason,
});

/** All suppliers with their balances, those we owe most first. ?active=1 for pickers. */
suppliersRouter.get("/", async (req, res) => {
  let query = db.selectFrom("suppliers").selectAll();
  if (req.query.active === "1") query = query.where("active", "=", true);
  const rows = await query.orderBy("name").execute();
  const { totals } = await supplierLedger(rows.map((r) => r.id));
  const body = rows.map((r) => toAdminSupplier(r, totals.get(r.id))).sort((a, b) => Number(b.active) - Number(a.active) || b.owed - a.owed || a.name.localeCompare(b.name));
  res.json(body);
});

async function loadSupplier(id: number): Promise<AdminSupplierDetail | null> {
  const s = await db.selectFrom("suppliers").selectAll().where("id", "=", id).executeTakeFirst();
  if (!s) return null;
  const [costs, payments, ledger] = await Promise.all([
    db
      .selectFrom("booking_costs")
      .innerJoin("bookings", "bookings.id", "booking_costs.booking_id")
      .innerJoin("customers", "customers.id", "bookings.customer_id")
      .selectAll("booking_costs")
      .select(["bookings.reference", "bookings.package_title", "customers.name as customer_name"])
      .where("booking_costs.supplier_id", "=", id)
      .orderBy("booking_costs.created_at", "desc")
      .execute(),
    db.selectFrom("supplier_payments").selectAll().where("supplier_id", "=", id).orderBy("paid_on", "desc").orderBy("id", "desc").execute(),
    supplierLedger([id]),
  ]);
  return {
    ...toAdminSupplier(s, ledger.totals.get(id)),
    costs: costs.map((c) => ({
      ...toAdminCost({ ...c, supplier_name: s.name }, ledger.costs.get(c.id)),
      bookingId: c.booking_id,
      reference: c.reference,
      customerName: c.customer_name,
      packageTitle: c.package_title,
    })),
    payments: payments.map(toPayment),
  };
}

suppliersRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const s = id && (await loadSupplier(id));
  if (!s) return void res.status(404).json({ ok: false, error: "Supplier not found" });
  res.json(s);
});

function isUniqueViolation(err: unknown) {
  return (err as { code?: string }).code === "23505";
}

const columns = (d: z.output<typeof supplierInputSchema>) => ({
  name: d.name.replace(/\s+/g, " "),
  type: d.type,
  contact_person: d.contactPerson,
  phone: d.phone,
  email: d.email?.toLowerCase() ?? null,
  notes: d.notes,
  active: d.active,
});

suppliersRouter.post("/", async (req, res) => {
  const data = parseBody(supplierInputSchema, req.body, res);
  if (!data) return;
  try {
    const row = await db.insertInto("suppliers").values(columns(data)).returning("id").executeTakeFirstOrThrow();
    res.status(201).json(await loadSupplier(row.id));
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    res.status(409).json({ ok: false, error: "A supplier with this name already exists" });
  }
});

suppliersRouter.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(supplierInputSchema, req.body, res);
  if (!id || !data) return;
  try {
    const row = await db.updateTable("suppliers").set({ ...columns(data), updated_at: new Date() }).where("id", "=", id).returning("id").executeTakeFirst();
    if (!row) return void res.status(404).json({ ok: false, error: "Supplier not found" });
    res.json(await loadSupplier(id));
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    res.status(409).json({ ok: false, error: "Another supplier already has this name" });
  }
});

/** Money paid to the supplier (rupees in, paise stored). It pays off their oldest costs first. */
suppliersRouter.post("/:id/payments", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(supplierPaymentSchema, req.body, res);
  if (!id || !data) return;
  if (data.paidOn > todayIST()) return void res.status(400).json({ ok: false, error: "The payment date can't be in the future" });
  const s = await db.selectFrom("suppliers").select("id").where("id", "=", id).executeTakeFirst();
  if (!s) return void res.status(404).json({ ok: false, error: "Supplier not found" });
  await db
    .insertInto("supplier_payments")
    .values({
      supplier_id: id,
      amount: Math.round(data.amount * 100),
      paid_on: data.paidOn,
      method: data.method,
      reference: data.reference,
      note: data.note,
      created_by: currentUser(res).name,
    })
    .execute();
  res.status(201).json(await loadSupplier(id));
});

/** A mistaken payment is voided, never deleted, so the payment history stays complete. */
suppliersRouter.post("/:id/payments/:pid/void", async (req, res) => {
  const id = parseId(req.params.id);
  const pid = parseId(req.params.pid);
  const data = parseBody(z.object({ reason: z.string().trim().min(3, "Say why it's being voided").max(200) }), req.body, res);
  if (!id || !pid || !data) return;
  const me = currentUser(res);
  const row = await db
    .updateTable("supplier_payments")
    .set({ voided_at: new Date(), void_reason: `${data.reason} (${me.name})` })
    .where("id", "=", pid)
    .where("supplier_id", "=", id)
    .where("voided_at", "is", null)
    .returning("amount")
    .executeTakeFirst();
  if (!row) return void res.status(404).json({ ok: false, error: "Payment not found or already voided" });
  console.info(`[suppliers] ${me.name} voided payment #${pid} (${formatINR(row.amount)}) for supplier #${id}`);
  res.json(await loadSupplier(id));
});
