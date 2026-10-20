import { randomBytes, randomInt } from "node:crypto";
import type { Response } from "express";
import type { ZodType } from "zod";

/** "+91 98765-43210", "9876543210" and "919876543210" all become "+919876543210". */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (input.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

// No 0/O/1/I/L so references are easy to read out over the phone.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function bookingReference() {
  let ref = "DT";
  for (let i = 0; i < 6; i++) ref += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return ref;
}

export function accessToken() {
  return randomBytes(24).toString("base64url");
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Parses a request body with a zod schema; on failure sends 400 and returns null. */
export function parseBody<T>(schema: ZodType<T>, body: unknown, res: Response): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return null;
  }
  return parsed.data;
}

export function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
export function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export const PAGE_SIZE = 25;

export function pageParam(value: unknown) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
