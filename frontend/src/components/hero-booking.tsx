"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { bookingRequestSchema } from "@dilruba/shared/booking";
import type { CategorySlug } from "@dilruba/shared/catalog";
import { enquirySchema, type services } from "@dilruba/shared/enquiry";
import { formatDay, type PublicDeparture } from "@dilruba/shared/ops";
import { serviceFor } from "@/lib/packages";
import { getReferral } from "@/lib/referral";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

/** A published package and its upcoming group dates (possibly none yet). */
export type BookablePackage = { category: CategorySlug; slug: string; title: string; departures: PublicDeparture[] };

const tabs: { label: string; categories: CategorySlug[]; service: (typeof services)[number] }[] = [
  { label: "Umrah", categories: ["umrah"], service: "Umrah" },
  { label: "Hajj", categories: ["hajj"], service: "Hajj" },
  { label: "Ziyarat", categories: ["iraq", "jordan", "palestine", "turkey"], service: "Iraq Ziyarat" },
  { label: "Holidays", categories: ["asia", "domestic"], service: "Asia Holiday" },
];

const counts = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function dateLabel(d: PublicDeparture) {
  const when = `${formatDay(d.startDate)}${d.endDate ? ` – ${formatDay(d.endDate)}` : ""}`;
  const seats = d.seatsLeft === 0 ? "full" : d.seatsLeft <= 5 ? `only ${d.seatsLeft} left` : `${d.seatsLeft} seats left`;
  return `${when} · ${seats}`;
}

/**
 * The home page booking card: pick a journey type, a package, then one of the group dates the
 * team has opened in the admin panel. With a date, submitting creates a booking request on it
 * (seats are held) and opens the customer's booking page. When a package has no open dates the
 * date box is disabled and the same form sends an enquiry instead, so the team can call back.
 */
export function HeroBooking({ packages }: { packages: BookablePackage[] }) {
  const router = useRouter();
  const inTab = (i: number) => packages.filter((p) => tabs[i]!.categories.includes(p.category));
  const hasDates = (p: BookablePackage) => p.departures.some((d) => d.seatsLeft > 0);
  // Start on the first journey type with open dates (Umrah if none have any).
  const [tabIndex, setTabIndex] = useState(() => Math.max(0, tabs.findIndex((_, i) => inTab(i).some(hasDates))));
  const choices = inTab(tabIndex);
  const firstKey = (list: BookablePackage[]) => {
    const p = list.find(hasDates) ?? list[0];
    return p ? `${p.category}/${p.slug}` : "";
  };
  const [pkgKey, setPkgKey] = useState(() => firstKey(choices));
  const pkg = choices.find((p) => `${p.category}/${p.slug}` === pkgKey) ?? choices[0];
  const open = pkg ? hasDates(pkg) : false;
  const [departureId, setDepartureId] = useState("");
  const departure = pkg?.departures.find((d) => String(d.id) === departureId);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [enquired, setEnquired] = useState<string | null>(null);

  function reset(next: { tab?: number; key?: string }) {
    if (next.tab !== undefined) setTabIndex(next.tab);
    setPkgKey(next.key ?? "");
    setDepartureId("");
    setError(null);
  }

  async function send(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { reference?: string; token?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "failed");
    return data;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const adults = Number(f.adults);
    const children = Number(f.children);

    // No open dates: the same details go to the team as an enquiry.
    if (!open) {
      const what = pkg?.title ?? `${tabs[tabIndex]!.label} package`;
      const parsed = enquirySchema.safeParse({
        name: f.name,
        phone: f.phone,
        email: f.email || undefined,
        service: pkg ? serviceFor[pkg.category] : tabs[tabIndex]!.service,
        packageName: pkg?.title,
        travellers: Math.min(99, adults + children),
        message: `Asked for the next available dates for ${what} (${adults} adult${adults === 1 ? "" : "s"}${children ? `, ${children} child${children === 1 ? "" : "ren"}` : ""}). No dates were open on the website.`,
        source: "Homepage booking card",
        referralCode: getReferral(),
        website: f.website || undefined,
      });
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the form");
      setError(null);
      setSending(true);
      try {
        await send("/api/enquiry", parsed.data);
        setEnquired(f.name.split(" ")[0] ?? "");
      } catch (err) {
        setError(err instanceof Error && err.message !== "failed" ? err.message : "We couldn't send that just now. Please try again, or WhatsApp us.");
      } finally {
        setSending(false);
      }
      return;
    }

    if (!pkg) return;
    if (!departure) return setError("Please choose a travel date");
    if (adults + children > departure.seatsLeft) {
      return setError(`Only ${departure.seatsLeft} seat${departure.seatsLeft === 1 ? "" : "s"} left on this date. Choose another date or fewer travellers.`);
    }
    const parsed = bookingRequestSchema.safeParse({
      ...f,
      packageCategory: pkg.category,
      packageSlug: pkg.slug,
      packageTitle: pkg.title,
      departureId: departure.id,
      travelMonth: departure.startDate.slice(0, 7),
      referralCode: getReferral(),
      notes: "Booked from the home page date picker.",
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the form");
    setError(null);
    setSending(true);
    try {
      const body = await send("/api/bookings", parsed.data);
      if (!body.reference) throw new Error("failed");
      router.push(`/booking?ref=${body.reference}&t=${encodeURIComponent(body.token ?? "")}&new=1`);
    } catch (err) {
      setSending(false);
      setError(err instanceof Error && err.message !== "failed" ? err.message : "We couldn't send your booking just now. Please try again, or WhatsApp us.");
    }
  }

  return (
    <div className="rounded-[1.75rem] bg-white p-5 text-ink shadow-2xl shadow-black/20 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-semibold sm:text-2xl">Plan your sacred journey</h2>
        <div role="tablist" aria-label="Journey type" className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-sand p-1">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={i === tabIndex}
              onClick={() => reset({ tab: i, key: firstKey(inTab(i)) })}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${i === tabIndex ? "bg-white text-ink shadow-sm" : "text-ink/65 hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {enquired !== null ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center" role="status">
          <CheckCircle2 className="size-12 text-[#25d366]" aria-hidden />
          <p className="text-xl font-semibold">JazakAllah Khair{enquired ? `, ${enquired}` : ""}!</p>
          <p className="max-w-md text-sm text-muted">We&apos;ll contact you with the next available dates and today&apos;s best price.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <a href={whatsappLink(`Assalamu Alaikum, I just asked for dates for ${pkg?.title ?? tabs[tabIndex]!.label}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
              <WhatsAppIcon className="size-4" /> Continue on WhatsApp
            </a>
            <button type="button" onClick={() => setEnquired(null)} className="btn btn-outline">
              Back to the form
            </button>
          </div>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="relative">
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          {choices.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Package:</span>
              {choices.map((p) => {
                const key = `${p.category}/${p.slug}`;
                const on = p === pkg;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => reset({ key })}
                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${on ? "border-ink bg-ink text-white" : "border-line text-ink/75 hover:border-ink"}`}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="hero-date" className="label">Available dates</label>
              <select
                id="hero-date"
                value={open ? departureId : ""}
                onChange={(e) => setDepartureId(e.target.value)}
                disabled={!open}
                className="field appearance-none disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted"
              >
                <option value="" disabled>
                  {open ? "Choose a date" : "No dates available yet"}
                </option>
                {pkg?.departures.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.seatsLeft === 0}>
                    {d.title === pkg.title ? "" : `${d.title}: `}
                    {dateLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="hero-adults" className="label">Adults</label>
              <select id="hero-adults" name="adults" defaultValue="2" className="field appearance-none">
                {counts(1, 20).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="hero-children" className="label">Children <span className="font-normal text-muted">(under 12)</span></label>
              <select id="hero-children" name="children" defaultValue="0" className="field appearance-none">
                {counts(0, 10).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="hero-name" className="label">Your name</label>
              <input id="hero-name" name="name" autoComplete="name" required placeholder="As on passport" className="field" />
            </div>
            <div>
              <label htmlFor="hero-phone" className="label">Phone / WhatsApp</label>
              <input id="hero-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+91 98XXX XXXXX" className="field" />
            </div>
            <div>
              <label htmlFor="hero-email" className="label">Email{!open && <span className="font-normal text-muted"> (optional)</span>}</label>
              <input id="hero-email" name="email" type="email" autoComplete="email" required={open} placeholder="you@example.com" className="field" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={sending} className="btn btn-primary w-full disabled:opacity-70">
                {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                {sending ? "Sending…" : open ? "Book this date" : "Get Free Quote"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted">
              {open ? "No payment now: we confirm your seats and email the final price." : "We'll contact you with the next available dates and today's best price."}
            </p>
            <Link href="/custom-package" className="font-medium text-brand hover:underline">
              Different dates? Build a custom package
            </Link>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-brand">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
