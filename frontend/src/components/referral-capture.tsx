"use client";

import { useEffect } from "react";
import { saveReferral } from "@/lib/referral";

/** Remembers a ?ref= code from a customer's shared link. Renders nothing. */
export function ReferralCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    // /booking, /quote and /feedback use ?ref= for their own reference.
    if (code && !/^\/(booking|quote|feedback)/.test(window.location.pathname)) saveReferral(code);
  }, []);
  return null;
}
