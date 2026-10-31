"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, CheckCircle2, CircleAlert, Loader2, Phone, Users } from "lucide-react";
import { formatINR, formatTravelMonth } from "@dilruba/shared/booking";
import { formatDay, type PublicQuote } from "@dilruba/shared/ops";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

export function QuoteView() {
  const search = useSearchParams();
  const router = useRouter();
  const ref = (search.get("ref") ?? "").toUpperCase();
  const token = search.get("t") ?? "";
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<{ busy: boolean; error?: string; declined?: boolean }>({ busy: false });

  const load = useCallback(async () => {
    if (!ref || !token) return setLoadError("This quote link is incomplete.");
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(ref)}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
      const body = (await res.json()) as { quote?: PublicQuote; error?: string };
      if (!res.ok || !body.quote) throw new Error(body.error ?? "Quote not found");
      setQuote(body.quote);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load your quote");
    }
  }, [ref, token]);

  useEffect(() => {
    // The quote lives in the backend, keyed by the secret link.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function respond(kind: "accept" | "decline") {
    setState({ busy: true });
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(ref)}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json()) as { bookingLink?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Something went wrong");
      if (kind === "accept" && body.bookingLink) {
        // Same site: go to the booking page to pay the deposit.
        const link = new URL(body.bookingLink);
        router.push(`${link.pathname}${link.search}&new=1`);
        return;
      }
      setState({ busy: false, declined: true });
      await load();
    } catch (err) {
      setState({ busy: false, error: err instanceof Error ? err.message : "Something went wrong" });
    }
  }

  if (loadError) {
    return (
      <div className="rounded-[1.75rem] border border-line bg-white p-8 text-center">
        <CircleAlert className="mx-auto size-10 text-brand" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold">We couldn&apos;t open this quote</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{loadError} Contact us and quote reference {ref || "from your message"}.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a href={whatsappLink(`Assalamu Alaikum, I need help with quote ${ref}.`)} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="size-4" /> WhatsApp us</a>
          <a href={site.phoneHref} className="btn btn-outline"><Phone className="size-4" aria-hidden /> {site.phone}</a>
        </div>
      </div>
    );
  }
  if (!quote) return <QuoteViewSkeleton />;

  const open = quote.status === "sent";
  const travellers = `${quote.adults} adult${quote.adults === 1 ? "" : "s"}${quote.children ? `, ${quote.children} child${quote.children === 1 ? "" : "ren"}` : ""}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-[1.75rem] border border-line bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
        <a href={`/api/quotes/${encodeURIComponent(ref)}/pdf?t=${encodeURIComponent(token)}`} className="btn btn-outline mb-4">Download letterhead PDF</a>
        <p className="text-sm text-muted">Quote {quote.reference} for {quote.customerName}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{quote.title}</h2>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <li className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-brand" aria-hidden />
            {quote.departure ? `${formatDay(quote.departure.startDate)}${quote.departure.endDate ? ` – ${formatDay(quote.departure.endDate)}` : ""}` : formatTravelMonth(quote.travelMonth)}
          </li>
          <li className="flex items-center gap-1.5"><Users className="size-4 text-brand" aria-hidden /> {travellers}</li>
        </ul>

        {quote.message && <p className="mt-6 whitespace-pre-wrap rounded-2xl bg-sand p-4 text-sm">{quote.message}</p>}

        <table className="mt-6 w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="py-2 font-medium">Item</th><th className="py-2 text-right font-medium">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {quote.items.map((i, n) => (
              <tr key={n}>
                <td className="py-3">{i.label}{i.quantity > 1 && <span className="text-muted"> × {i.quantity} @ {formatINR(i.unitPrice)}</span>}</td>
                <td className="py-3 text-right">{formatINR(i.quantity * i.unitPrice)}</td>
              </tr>
            ))}
            {quote.discount > 0 && (
              <tr className="text-[#0f7a3a]"><td className="py-3">Discount</td><td className="py-3 text-right">−{formatINR(quote.discount)}</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink text-base font-semibold"><td className="py-3">Total</td><td className="py-3 text-right">{formatINR(quote.total)}</td></tr>
          </tfoot>
        </table>
        <p className="text-xs text-muted">Including GST. For overseas trips, TCS as per income-tax rules is added on the booking and can be claimed back in your tax return.</p>

        {quote.inclusions.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold">What&apos;s included</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {quote.inclusions.map((i) => (
                <li key={i} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-[#1a9b4b]" aria-hidden /> {i}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <aside className="h-fit rounded-[1.75rem] bg-sand p-6">
        <p className="text-sm text-muted">Total</p>
        <p className="font-display text-4xl font-semibold">{formatINR(quote.total)}</p>
        {quote.deposit !== null && <p className="mt-1 text-sm">Confirm with a deposit of <strong>{formatINR(quote.deposit)}</strong></p>}
        {quote.validUntil && open && <p className="mt-1 text-sm text-muted">Valid until {formatDay(quote.validUntil)}</p>}

        {open ? (
          <div className="mt-6 grid gap-2">
            <button type="button" onClick={() => void respond("accept")} disabled={state.busy} className="btn btn-primary disabled:opacity-70">
              {state.busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />} Accept & book
            </button>
            <p className="text-center text-xs text-muted">You&apos;ll go to your booking page to pay the deposit securely.</p>
            <button type="button" onClick={() => void respond("decline")} disabled={state.busy} className="mt-2 text-sm text-muted underline-offset-2 hover:underline">
              No thanks
            </button>
          </div>
        ) : quote.status === "accepted" ? (
          <div className="mt-6">
            <p className="flex items-center gap-2 font-semibold text-[#0f7a3a]"><CheckCircle2 className="size-5" aria-hidden /> You accepted this quote</p>
            {quote.bookingLink && <a href={quote.bookingLink} className="btn btn-primary mt-4 w-full">Go to your booking</a>}
          </div>
        ) : (
          <p className="mt-6 text-sm">
            {quote.status === "expired" ? "This quote has expired. Prices and availability may have changed; message us for an updated quote." : state.declined ? "Thank you for letting us know. If anything changes, we're here to help." : "This quote was declined."}
          </p>
        )}
        {state.error && <p role="alert" className="mt-4 text-sm font-medium text-brand">{state.error}</p>}

        <div className="mt-6 border-t border-line pt-5">
          <a href={whatsappLink(`Assalamu Alaikum, I have a question about quote ${quote.reference}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp w-full">
            <WhatsAppIcon className="size-4" /> Questions? WhatsApp us
          </a>
        </div>
      </aside>
    </div>
  );
}

export function QuoteViewSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]" aria-busy="true" aria-label="Loading your quote">
      <div className="h-96 animate-pulse rounded-[1.75rem] bg-sand" />
      <div className="h-64 animate-pulse rounded-[1.75rem] bg-sand" />
    </div>
  );
}
