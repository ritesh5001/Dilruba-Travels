"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/login", { method: "POST", body: { email: form.get("email"), password: form.get("password") } });
      // Only follow same-site admin paths after login.
      const next = params.get("next");
      router.replace(next?.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-[1.75rem] border border-line bg-white p-7 shadow-xl shadow-black/5">
      <div className="flex size-11 items-center justify-center rounded-full bg-brand/10">
        <Lock className="size-5 text-brand" aria-hidden />
      </div>
      <h1 className="mt-4 text-2xl font-semibold">Dilruba CRM</h1>
      <p className="mt-1 text-sm text-muted">Log in to manage leads, bookings and payments.</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div>
          <label htmlFor="admin-email" className="label">Email</label>
          <input id="admin-email" name="email" type="email" autoComplete="username" required className="field" />
        </div>
        <div>
          <label htmlFor="admin-password" className="label">Password</label>
          <input id="admin-password" name="password" type="password" autoComplete="current-password" required className="field" />
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-70">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Log in
        </button>
        {error && <p role="alert" className="text-sm font-medium text-brand">{error}</p>}
      </form>
    </div>
  );
}
