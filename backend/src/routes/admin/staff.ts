import { staffInputSchema, type StaffUser } from "@dilruba/shared/ops";
import { Router } from "express";
import { config } from "../../config.ts";
import { db } from "../../db/index.ts";
import { forgetUser } from "../../lib/auth.ts";
import { hashPassword } from "../../lib/password.ts";
import { parseBody, parseId } from "../../lib/util.ts";

// Staff accounts (owner only). The main owner login from ADMIN_EMAIL isn't listed: it can't be
// removed from here, so nobody can lock the owner out.
export const staffRouter = Router();

const toStaff = (u: { id: number; name: string; email: string; role: StaffUser["role"]; active: boolean; last_login_at: Date | null; created_at: Date }): StaffUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active,
  lastLoginAt: u.last_login_at?.toISOString() ?? null,
  createdAt: u.created_at.toISOString(),
});

const columns = ["id", "name", "email", "role", "active", "last_login_at", "created_at"] as const;

staffRouter.get("/", async (_req, res) => {
  const rows = await db.selectFrom("users").select(columns).orderBy("active", "desc").orderBy("name").execute();
  res.json(rows.map(toStaff));
});

function isUniqueViolation(err: unknown) {
  return (err as { code?: string }).code === "23505";
}

staffRouter.post("/", async (req, res) => {
  const data = parseBody(staffInputSchema, req.body, res);
  if (!data) return;
  if (!data.password) return void res.status(400).json({ ok: false, error: "Set a password (at least 10 characters) for the new account" });
  const email = data.email.toLowerCase();
  if (email === config.ADMIN_EMAIL?.toLowerCase()) return void res.status(409).json({ ok: false, error: "That's the main owner login already" });
  try {
    const row = await db
      .insertInto("users")
      .values({ name: data.name, email, role: data.role, active: data.active, password_hash: await hashPassword(data.password) })
      .returning(columns)
      .executeTakeFirstOrThrow();
    res.status(201).json(toStaff(row));
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    res.status(409).json({ ok: false, error: "Someone already has that email" });
  }
});

staffRouter.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(staffInputSchema, req.body, res);
  if (!id || !data) return;
  const email = data.email.toLowerCase();
  if (email === config.ADMIN_EMAIL?.toLowerCase()) return void res.status(409).json({ ok: false, error: "That's the main owner login already" });
  try {
    const row = await db
      .updateTable("users")
      .set({
        name: data.name,
        email,
        role: data.role,
        active: data.active,
        ...(data.password ? { password_hash: await hashPassword(data.password) } : {}),
      })
      .where("id", "=", id)
      .returning(columns)
      .executeTakeFirst();
    if (!row) return void res.status(404).json({ ok: false, error: "Staff member not found" });
    // Deactivating or changing the email signs them out straight away.
    forgetUser(id);
    res.json(toStaff(row));
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    res.status(409).json({ ok: false, error: "Someone already has that email" });
  }
});
