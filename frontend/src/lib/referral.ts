"use client";

// A past customer shares dilrubatravels.com/?ref=AYESHA7K2. We remember the code in this
// browser for 60 days, and the enquiry and booking forms send it along so the CRM credits them.

const KEY = "dt_ref";
const DAYS = 60;

export function saveReferral(code: string) {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (!clean) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: clean, until: Date.now() + DAYS * 864e5 }));
  } catch {
    // Private mode or storage blocked: the referral just isn't remembered.
  }
}

export function getReferral(): string | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { code?: string; until?: number } | null;
    return saved?.code && saved.until && saved.until > Date.now() ? saved.code : undefined;
  } catch {
    return undefined;
  }
}
