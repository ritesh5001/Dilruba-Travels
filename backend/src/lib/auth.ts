import { createHmac } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config.ts";
import { safeEqual } from "./password.ts";

export { safeEqual, verifyPassword } from "./password.ts";

export const SESSION_COOKIE = "dt_admin";
const SESSION_DAYS = 7;

function sign(value: string) {
  return createHmac("sha256", config.SESSION_SECRET).update(value).digest("base64url");
}

function createSession(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + SESSION_DAYS * 864e5 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readSession(token: string | undefined): { email: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email?: string; exp?: number };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    // A changed ADMIN_EMAIL signs everyone out.
    if (data.email !== config.ADMIN_EMAIL) return null;
    return { email: data.email };
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

export function setSessionCookie(res: Response, email: string) {
  res.cookie(SESSION_COOKIE, createSession(email), {
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

export function getAdmin(req: Request) {
  return readSession(getCookie(req, SESSION_COOKIE));
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!getAdmin(req)) {
    res.status(401).json({ ok: false, error: "Please log in" });
    return;
  }
  next();
}

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
