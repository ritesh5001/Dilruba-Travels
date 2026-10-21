import { defaultSettings, settingsSchema, type Settings } from "@dilruba/shared/ops";
import { sql } from "kysely";
import { db } from "../db/index.ts";

// Business settings live in one row of the settings table, edited on the admin Settings page.
// Kept in memory after the first read; saving replaces the copy.

const KEY = "business";
let cached: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (cached) return cached;
  const row = await db.selectFrom("settings").select("value").where("key", "=", KEY).executeTakeFirst();
  // Fields added in later versions fall back to their defaults.
  const parsed = settingsSchema.safeParse({ ...defaultSettings, ...(row?.value as object | undefined) });
  cached = parsed.success ? parsed.data : defaultSettings;
  return cached;
}

export async function saveSettings(next: Settings) {
  await db
    .insertInto("settings")
    .values({ key: KEY, value: JSON.stringify(next) })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: JSON.stringify(next), updated_at: sql<Date>`now()` }))
    .execute();
  cached = next;
  return next;
}

/** Small values the server keeps for itself, e.g. when the daily digest last went out. */
export async function getInternal<T>(key: string): Promise<T | null> {
  const row = await db.selectFrom("settings").select("value").where("key", "=", `internal:${key}`).executeTakeFirst();
  return (row?.value as T | undefined) ?? null;
}

export async function setInternal(key: string, value: unknown) {
  const json = JSON.stringify(value);
  await db
    .insertInto("settings")
    .values({ key: `internal:${key}`, value: json })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: json, updated_at: sql<Date>`now()` }))
    .execute();
}

/** TCS for a package price, if its category is overseas (paise, rounded to the rupee). */
export function tcsFor(settings: Settings, category: string | null, total: number | null) {
  if (!total || !category || !(settings.tcsCategories as string[]).includes(category)) return 0;
  return Math.round((total * settings.tcsRate) / 100 / 100) * 100;
}
