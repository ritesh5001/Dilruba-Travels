import { createHmac } from "node:crypto";
import { can, type Me, type Permission } from "@dilruba/shared/ops";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config.ts";
import { db } from "../db/index.ts";
import { safeEqual } from "./password.ts";
import { getInternal } from "../services/settings.ts";

export { safeEqual, verifyPassword } from "./password.ts";

export const SESSION_COOKIE = "dt_admin";
const SESSION_DAYS = 7;

// Two kinds of login: the owner from ADMIN_EMAIL/ADMIN_PASSWORD_HASH (uid 0, always an owner)
// and staff accounts stored in the users table, which the owner adds on the Staff page.
export const ENV_OWNER_ID = 0;

function sign(value: string) {
  return createHmac("sha256", config.SESSION_SECRET).update(value).digest("base64url");
}

export async function passwordHashFor(uid: number): Promise<string | null> {
  if (uid === ENV_OWNER_ID) {
    const saved = await getInternal<{ email: string; hash: string }>("ownerPassword");
    return saved && saved.email === config.ADMIN_EMAIL ? saved.hash : config.ADMIN_PASSWORD_HASH ?? null;
  }
  const user = await db.selectFrom("users").select("password_hash").where("id", "=", uid).executeTakeFirst();
  return user?.password_hash ?? null;
}

async function createSession(uid: number, email: string) {
  const payload = Buffer.from(JSON.stringify({ uid, email, credential: sign((await passwordHashFor(uid)) ?? ""), exp: Date.now() + SESSION_DAYS * 864e5 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readSession(token: string | undefined): { uid: number; email: string; credential?: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid?: number; email?: string; credential?: string; exp?: number };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    // Sessions from before staff accounts carry no uid: they belong to the owner.
    return { uid: data.uid ?? ENV_OWNER_ID, email: data.email, credential: data.credential };
  } catch {
    return null;
  }
}

function getCookie(req: Request, name: string) {
  for (const part of req.headers.cookie?.split(";") ?? []) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function setSessionCookie(res: Response, uid: number, email: string) {
  res.cookie(SESSION_COOKIE, await createSession(uid, email), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/",
    maxAge: SESSION_DAYS * 864e5,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: config.isProduction, path: "/" });
}

export function envOwner(): Me | null {
  return config.ADMIN_EMAIL ? { id: ENV_OWNER_ID, name: "Owner", email: config.ADMIN_EMAIL, role: "owner" } : null;
}

// Staff accounts are checked on every request (so removing someone signs them out), but each
// lookup is reused for a short while so the admin panel doesn't pay a database trip per click.
const USER_CACHE_MS = 30_000;
const userCache = new Map<number, { me: Me | null; at: number }>();

export function forgetUser(id: number) {
  userCache.delete(id);
}

async function loadUser(id: number): Promise<Me | null> {
  const hit = userCache.get(id);
  if (hit && Date.now() - hit.at < USER_CACHE_MS) return hit.me;
  const row = await db.selectFrom("users").select(["id", "name", "email", "role", "active"]).where("id", "=", id).executeTakeFirst();
  const me: Me | null = row?.active ? { id: row.id, name: row.name, email: row.email, role: row.role } : null;
  userCache.set(id, { me, at: Date.now() });
  return me;
}

export async function getAdmin(req: Request): Promise<Me | null> {
  const session = readSession(getCookie(req, SESSION_COOKIE));
  if (!session) return null;
  const hash = await passwordHashFor(session.uid);
  if (!hash || !session.credential || !safeEqual(session.credential, sign(hash))) return null;
  if (session.uid === ENV_OWNER_ID) {
    // A changed ADMIN_EMAIL signs the owner out.
    const owner = envOwner();
    return owner && session.email === owner.email ? owner : null;
  }
  const user = await loadUser(session.uid);
  // A changed email signs that person out too.
  return user && user.email === session.email ? user : null;
}

/** The logged-in person, set by requireAdmin. */
export function currentUser(res: Response): Me {
  return res.locals.me as Me;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const me = await getAdmin(req);
  if (!me) {
    res.status(401).json({ ok: false, error: "Please log in" });
    return;
  }
  res.locals.me = me;
  next();
}

/** Whether the logged-in person's role includes a permission. */
export function userCan(res: Response, permission: Permission) {
  return can(currentUser(res).role, permission);
}

/** Lets the request through if the person has any of the permissions; 403 otherwise. */
export function requirePermission(...needed: Permission[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!needed.some((p) => userCan(res, p))) {
      res.status(403).json({ ok: false, error: "Your role doesn't allow this. Ask the owner if you need access." });
      return;
    }
    next();
  };
}

/** Reads need `read`, anything that changes data needs `write`. */
export function guard({ read, write }: { read: Permission | Permission[]; write: Permission | Permission[] }) {
  const reads = requirePermission(...[read].flat());
  const writes = requirePermission(...[write].flat());
  return (req: Request, res: Response, next: NextFunction) => (req.method === "GET" || req.method === "HEAD" ? reads : writes)(req, res, next);
}

/** Staff and settings: owners only. */
export const requireOwner = requirePermission("staff");

/** Small in-memory fixed-window limiter; enough for one server instance. */
export function rateLimit({ windowMs, max, message }: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    if (entry.count > max) {
      res.status(429).json({ ok: false, error: message });
      return;
    }
    next();
  };
}
