"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { bookingRequestSchema } from "@dilruba/shared/booking";
import { formatDay, type PublicDeparture } from "@dilruba/shared/ops";
import { getReferral } from "@/lib/referral";

type Pkg = { category: string; slug: string; title: string; departures?: PublicDeparture[] };

function nextMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) };
  });
}

const counts = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export function BookingForm({ pkg }: { pkg: Pkg }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [months] = useState(() => nextMonths(18));
  const departures = pkg.departures ?? [];
  const [departureId, setDepartureId] = useState("");
  const departure = departures.find((d) => String(d.id) === departureId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (data.notes === "") delete data.notes;
    delete data.departureId;
    if (departure) {
      const travellers = Number(data.adults) + Number(data.children);
      if (travellers > departure.seatsLeft) {
        setError(`Only ${departure.seatsLeft} seat${departure.seatsLeft === 1 ? "" : "s"} left on this date. Choose another date or reduce travellers.`);
        return;
      }
    }
    const parsed = bookingRequestSchema.safeParse({
      ...data,
      ...(departure ? { departureId: departure.id, travelMonth: departure.startDate.slice(0, 7) } : {}),
      referralCode: getReferral(),
      packageCategory: pkg.category,
      packageSlug: pkg.slug,
      packageTitle: pkg.title,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json()) as { ok: boolean; reference?: string; token?: string; error?: string };
      if (!res.ok || !body.reference) throw new Error(body.error ?? "Booking failed");
      router.push(`/booking?ref=${body.reference}&t=${encodeURIComponent(body.token ?? "")}&new=1`);
    } catch (err) {
      setSending(false);
      setError(
        err instanceof Error && err.message !== "Booking failed"
          ? err.message
          : "We couldn't send your booking just now. Please try again, or call or WhatsApp us.",
      );
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="relative grid gap-4 sm:grid-cols-2">
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="bk-name" className="label">Lead traveller&apos;s full name</label>
        <input id="bk-name" name="name" autoComplete="name" required placeholder="As on passport" className="field" />
      </div>
      <div>
        <label htmlFor="bk-email" className="label">Email</label>
        <input id="bk-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="field" />
      </div>
      <div>
        <label htmlFor="bk-phone" className="label">Phone / WhatsApp</label>
        <input id="bk-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+91 98XXX XXXXX" className="field" />
      </div>
      {departures.length > 0 && (
        <div className="sm:col-span-2">
          <label htmlFor="bk-departure" className="label">Group date</label>
          <select id="bk-departure" name="departureId" value={departureId} onChange={(e) => setDepartureId(e.target.value)} className="field appearance-none">
            <option value="">Other dates (tell us your month)</option>
            {departures.map((d) => (
              <option key={d.id} value={d.id} disabled={d.seatsLeft === 0}>
                {d.title}: {formatDay(d.startDate)}{d.endDate ? ` – ${formatDay(d.endDate)}` : ""} · {d.seatsLeft === 0 ? "full" : `${d.seatsLeft} seat${d.seatsLeft === 1 ? "" : "s"} left`}
              </option>
            ))}
          </select>
        </div>
      )}
      {!departure && (
        <div className="sm:col-span-2">
          <label htmlFor="bk-month" className="label">Travel month</label>
          <select id="bk-month" name="travelMonth" required defaultValue="" className="field appearance-none">
            <option value="" disabled>Choose a month</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="bk-adults" className="label">Adults</label>
        <select id="bk-adults" name="adults" defaultValue="2" className="field appearance-none">
          {counts(1, 30).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="bk-children" className="label">Children <span className="font-normal text-muted">(under 12)</span></label>
        <select id="bk-children" name="children" defaultValue="0" className="field appearance-none">
          {counts(0, 20).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="bk-notes" className="label">
          Anything we should know? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="bk-notes"
          name="notes"
          rows={3}
          placeholder="Room sharing, wheelchair assistance, preferred dates…"
          className="field resize-none"
        />
      </div>

      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          No payment now. We&apos;ll email your final price, then you pay a deposit online to confirm.
        </p>
        <button type="submit" disabled={sending} className="btn btn-primary w-full shrink-0 disabled:opacity-70 sm:w-auto">
          {sending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {sending ? "Sending…" : "Request booking"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-brand sm:col-span-2">
          {error}
        </p>
      )}
    </form>
  );
}
