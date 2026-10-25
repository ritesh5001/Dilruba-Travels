"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { bookingRequestSchema } from "@dilruba/shared/booking";
import type { CategorySlug } from "@dilruba/shared/catalog";
import { enquirySchema } from "@dilruba/shared/enquiry";
import { formatDay, type PublicDeparture } from "@dilruba/shared/ops";
import { serviceFor } from "@/lib/packages";
import { getReferral } from "@/lib/referral";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

type Pkg = { category: CategorySlug; slug: string; title: string; departures?: PublicDeparture[] };

const counts = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function dateLabel(d: PublicDeparture) {
  const when = `${formatDay(d.startDate)}${d.endDate ? ` – ${formatDay(d.endDate)}` : ""}`;
  const seats = d.seatsLeft === 0 ? "full" : d.seatsLeft <= 5 ? `only ${d.seatsLeft} left` : `${d.seatsLeft} seats left`;
  return `${when} · ${seats}`;
}

/**
 * "Book this package": the customer can only choose one of the group dates set in the admin
 * panel. With a date, it creates a booking request on it (seats are held). When the package has
 * no open dates, the date box is disabled and the form sends an enquiry instead.
 */
export function BookingForm({ pkg }: { pkg: Pkg }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [enquired, setEnquired] = useState<string | null>(null);
  const departures = pkg.departures ?? [];
  const open = departures.some((d) => d.seatsLeft > 0);
  const [departureId, setDepartureId] = useState("");
  const departure = departures.find((d) => String(d.id) === departureId);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { reference?: string; token?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "failed");
    return data;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const adults = Number(data.adults);
    const children = Number(data.children);

    let request: { url: string; body: unknown };
    if (open) {
      if (!departure) return setError("Please choose a travel date");
      if (adults + children > departure.seatsLeft) {
        return setError(`Only ${departure.seatsLeft} seat${departure.seatsLeft === 1 ? "" : "s"} left on this date. Choose another date or fewer travellers.`);
      }
      const parsed = bookingRequestSchema.safeParse({
        ...data,
        notes: data.notes || undefined,
        departureId: departure.id,
        travelMonth: departure.startDate.slice(0, 7),
        referralCode: getReferral(),
        packageCategory: pkg.category,
        packageSlug: pkg.slug,
        packageTitle: pkg.title,
      });
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the form");
      request = { url: "/api/bookings", body: parsed.data };
    } else {
      // No dates open yet: the same details go to the team as an enquiry.
      const parsed = enquirySchema.safeParse({
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        service: serviceFor[pkg.category],
        packageName: pkg.title,
        travellers: Math.min(99, adults + children),
        message: [
          `Asked for the next available dates (${adults} adult${adults === 1 ? "" : "s"}${children ? `, ${children} child${children === 1 ? "" : "ren"}` : ""}). No dates were open on the website.`,
          data.notes && `Notes: ${data.notes}`,
        ]
          .filter(Boolean)
          .join("\n"),
        source: `Book page: ${pkg.title}`,
        referralCode: getReferral(),
        website: data.website || undefined,
      });
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the form");
      request = { url: "/api/enquiry", body: parsed.data };
    }

    setError(null);
    setSending(true);
    try {
      const body = await post(request.url, request.body);
      if (!open) {
        setEnquired(data.name.split(" ")[0] ?? "");
        setSending(false);
        return;
      }
      if (!body.reference) throw new Error("failed");
      router.push(`/booking?ref=${body.reference}&t=${encodeURIComponent(body.token ?? "")}&new=1`);
    } catch (err) {
      setSending(false);
      setError(err instanceof Error && err.message !== "failed" ? err.message : "We couldn't send that just now. Please try again, or call or WhatsApp us.");
    }
  }

  if (enquired !== null) {
    return (
      <div className="flex flex-col items-center py-8 text-center" role="status">
        <CheckCircle2 className="size-12 text-[#25d366]" aria-hidden />
        <p className="mt-3 text-xl font-semibold">JazakAllah Khair{enquired ? `, ${enquired}` : ""}!</p>
        <p className="mt-2 max-w-md text-sm text-muted">We&apos;ll contact you with the next available dates for {pkg.title} and today&apos;s best price.</p>
        <a href={whatsappLink(`Assalamu Alaikum, I asked for the next dates for ${pkg.title}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp mt-5">
          <WhatsAppIcon className="size-4" /> Continue on WhatsApp
        </a>
      </div>
    );
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
        <label htmlFor="bk-email" className="label">Email{!open && <span className="font-normal text-muted"> (optional)</span>}</label>
        <input id="bk-email" name="email" type="email" autoComplete="email" required={open} placeholder="you@example.com" className="field" />
      </div>
      <div>
        <label htmlFor="bk-phone" className="label">Phone / WhatsApp</label>
        <input id="bk-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+91 98XXX XXXXX" className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="bk-date" className="label">Travel date</label>
        <select
          id="bk-date"
          value={open ? departureId : ""}
          onChange={(e) => setDepartureId(e.target.value)}
          disabled={!open}
          className="field appearance-none disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted"
        >
          <option value="" disabled>
            {open ? "Choose a date" : "No dates available yet"}
          </option>
          {departures.map((d) => (
            <option key={d.id} value={d.id} disabled={d.seatsLeft === 0}>
              {d.title === pkg.title ? "" : `${d.title}: `}
              {dateLabel(d)}
            </option>
          ))}
        </select>
      </div>
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
        <textarea id="bk-notes" name="notes" rows={3} placeholder="Room sharing, wheelchair assistance…" className="field resize-none" />
      </div>

      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          {open ? "No payment now. We'll email your final price, then you pay a deposit online to confirm." : "We'll contact you with the next available dates and today's best price."}
        </p>
        <button type="submit" disabled={sending} className="btn btn-primary w-full shrink-0 disabled:opacity-70 sm:w-auto">
          {sending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {sending ? "Sending…" : open ? "Request booking" : "Get Free Quote"}
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
