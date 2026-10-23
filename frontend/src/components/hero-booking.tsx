"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX2, Loader2, Send, Sparkles } from "lucide-react";
import { bookingRequestSchema } from "@dilruba/shared/booking";
import type { CategorySlug } from "@dilruba/shared/catalog";
import { formatDay, type PublicDeparture } from "@dilruba/shared/ops";
import { getReferral } from "@/lib/referral";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

/** A package that has at least one upcoming group date. */
export type BookablePackage = { category: CategorySlug; slug: string; title: string; departures: PublicDeparture[] };

const tabs: { label: string; categories: CategorySlug[] }[] = [
  { label: "Umrah", categories: ["umrah"] },
  { label: "Hajj", categories: ["hajj"] },
  { label: "Ziyarat", categories: ["iraq", "jordan", "palestine", "turkey"] },
  { label: "Holidays", categories: ["asia", "domestic"] },
];

const counts = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function dateLabel(d: PublicDeparture) {
  const when = `${formatDay(d.startDate)}${d.endDate ? ` – ${formatDay(d.endDate)}` : ""}`;
  const seats = d.seatsLeft === 0 ? "full" : d.seatsLeft <= 5 ? `only ${d.seatsLeft} left` : `${d.seatsLeft} seats left`;
  return `${when} · ${seats}`;
}

/**
 * The home page booking card: pick a journey type, one of its packages, then one of the group
 * dates the team has opened in the admin panel. Submitting creates a booking request on that
 * date (seats are held) and opens the customer's booking page.
 */
export function HeroBooking({ packages }: { packages: BookablePackage[] }) {
  const router = useRouter();
  const inTab = (i: number) => packages.filter((p) => tabs[i]!.categories.includes(p.category));
  // Start on the first journey type that has dates.
  const [tabIndex, setTabIndex] = useState(() => Math.max(0, tabs.findIndex((_, i) => inTab(i).length > 0)));
  const choices = inTab(tabIndex);
  const [pkgKey, setPkgKey] = useState(() => (choices[0] ? `${choices[0].category}/${choices[0].slug}` : ""));
  const pkg = choices.find((p) => `${p.category}/${p.slug}` === pkgKey) ?? choices[0];
  const [departureId, setDepartureId] = useState("");
  const departure = pkg?.departures.find((d) => String(d.id) === departureId);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function selectTab(i: number) {
    setTabIndex(i);
    const first = inTab(i)[0];
    setPkgKey(first ? `${first.category}/${first.slug}` : "");
    setDepartureId("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pkg) return;
    if (!departure) return setError("Please choose a travel date");
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const adults = Number(f.adults);
    const children = Number(f.children);
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
      const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body = (await res.json()) as { reference?: string; token?: string; error?: string };
      if (!res.ok || !body.reference) throw new Error(body.error ?? "Booking failed");
      router.push(`/booking?ref=${body.reference}&t=${encodeURIComponent(body.token ?? "")}&new=1`);
    } catch (err) {
      setSending(false);
      setError(err instanceof Error && err.message !== "Booking failed" ? err.message : "We couldn't send your booking just now. Please try again, or WhatsApp us.");
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
              onClick={() => selectTab(i)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${i === tabIndex ? "bg-white text-ink shadow-sm" : "text-ink/65 hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!pkg ? (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl bg-sand px-5 py-8 text-center">
          <CalendarX2 className="size-9 text-brand" aria-hidden />
          <div>
            <p className="font-semibold">No fixed {tabs[tabIndex]!.label.toLowerCase()} dates are open right now</p>
            <p className="mt-1 text-sm text-muted">Tell us when you&apos;d like to travel and we&apos;ll build a package around your dates.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/custom-package" className="btn btn-primary">
              <Sparkles className="size-4" aria-hidden /> Build a custom package
            </Link>
            <a href={whatsappLink(`Assalamu Alaikum, I'd like to know the next ${tabs[tabIndex]!.label} dates.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
              <WhatsAppIcon className="size-4" /> Ask on WhatsApp
            </a>
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
                  onClick={() => {
                    setPkgKey(key);
                    setDepartureId("");
                    setError(null);
                  }}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${on ? "border-ink bg-ink text-white" : "border-line text-ink/75 hover:border-ink"}`}
                >
                  {p.title}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="hero-date" className="label">Available dates</label>
              <select id="hero-date" value={departureId} onChange={(e) => setDepartureId(e.target.value)} required className="field appearance-none">
                <option value="" disabled>
                  Choose a date ({pkg.departures.length} available)
                </option>
                {pkg.departures.map((d) => (
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
              <label htmlFor="hero-email" className="label">Email</label>
              <input id="hero-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="field" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={sending} className="btn btn-primary w-full disabled:opacity-70">
                {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                {sending ? "Booking…" : "Book this date"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted">No payment now: we confirm your seats and email the final price.</p>
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
