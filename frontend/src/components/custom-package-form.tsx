"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { enquirySchema, services } from "@dilruba/shared/enquiry";
import { todayIST } from "@dilruba/shared/ops";
import { getReferral } from "@/lib/referral";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

type Service = (typeof services)[number];

const tripTypes = services.filter((s) => s !== "Other");
const hotelTypes = ["Economy / standard", "3 Star", "4 Star", "5 Star"];
const sharingTypes = ["Quad (4 sharing)", "Triple (3 sharing)", "Double (2 sharing)", "Single"];
const budgets = ["₹50,000 – ₹1,00,000", "₹1,00,000 – ₹2,00,000"];
const CUSTOM_BUDGET = "Custom";
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const isPilgrimage = (s: Service) => s === "Umrah" || s === "Hajj";

/**
 * "Build your own package": the customer describes the trip they want (dates, nights, hotels,
 * sharing, people). It arrives in the CRM as a lead with every detail in the message.
 */
export function CustomPackageForm() {
  const [service, setService] = useState<Service>("Umrah");
  const [budget, setBudget] = useState("");
  const [state, setState] = useState<{ sending?: boolean; error?: string; done?: { name: string; text: string } }>({});
  const [today] = useState(() => todayIST());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => ((f.get(k) as string | null) ?? "").trim();
    const adults = Number(v("adults"));
    const children = Number(v("children"));
    const infants = Number(v("infants"));
    const date = v("travelDate");

    const lines = [
      `Custom ${service} package`,
      date && `Travel date: ${date}`,
      v("departureCity") && `From: ${v("departureCity")}`,
      isPilgrimage(service) ? `Nights: ${v("nightsMakkah") || "?"} in Makkah, ${v("nightsMadinah") || "?"} in Madinah` : `Nights: ${v("nights") || "?"}`,
      !isPilgrimage(service) && v("places") && `Places: ${v("places")}`,
      `Hotels: ${v("hotel")}`,
      `Room sharing: ${v("sharing")}`,
      budget && `Budget per person: ${budget === CUSTOM_BUDGET ? (v("customBudget") ? `₹${v("customBudget")}` : "custom (not given)") : budget}`,
      `Flights: ${v("flights")}`,
      `Travellers: ${adults} adult${adults === 1 ? "" : "s"}${children ? `, ${children} child${children === 1 ? "" : "ren"}` : ""}${infants ? `, ${infants} infant${infants === 1 ? "" : "s"}` : ""}`,
      v("nationality") && `Nationality: ${v("nationality")}`,
      v("comments") && `Notes: ${v("comments")}`,
    ].filter(Boolean) as string[];

    const parsed = enquirySchema.safeParse({
      name: v("name"),
      phone: v("phone"),
      email: v("email") || undefined,
      service,
      option: "Custom package",
      packageName: `Custom ${service} package`,
      travelMonth: date ? date.slice(0, 7) : undefined,
      travellers: Math.min(99, adults + children + infants),
      message: lines.join("\n"),
      source: "Custom package form",
      referralCode: getReferral(),
      website: v("website") || undefined,
    });
    if (!parsed.success) return setState({ error: parsed.error.issues[0]?.message ?? "Please check the form" });
    setState({ sending: true });
    try {
      const res = await fetch("/api/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "failed");
      setState({ done: { name: v("name"), text: `Assalamu Alaikum, I just sent a custom package request.\n\n${lines.join("\n")}` } });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setState({ error: err instanceof Error && err.message !== "failed" ? err.message : "We couldn't send that right now. Please try again or message us on WhatsApp." });
    }
  }

  if (state.done) {
    return (
      <div className="flex flex-col items-center py-10 text-center" role="status">
        <CheckCircle2 className="size-14 text-[#25d366]" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold">JazakAllah Khair, {state.done.name.split(" ")[0]}!</h2>
        <p className="mt-2 max-w-md text-muted">
          We&apos;ve received your request. Our team will prepare a personalised quote and contact you, usually within one
          working day.
        </p>
        <a href={whatsappLink(state.done.text)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp mt-6">
          <WhatsAppIcon className="size-4" /> Continue on WhatsApp
        </a>
      </div>
    );
  }

  const fieldset = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
  const legend = "mb-4 text-lg font-semibold";

  return (
    <form noValidate onSubmit={onSubmit} className="relative space-y-8">
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend className={legend}>Your trip</legend>
        <div className={fieldset}>
          <div>
            <label htmlFor="cp-service" className="label">Trip type</label>
            <select id="cp-service" value={service} onChange={(e) => setService(e.target.value as Service)} className="field appearance-none">
              {tripTypes.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cp-date" className="label">Travel date</label>
            <input id="cp-date" name="travelDate" type="date" min={today} className="field" />
          </div>
          <div>
            <label htmlFor="cp-city" className="label">Departure city</label>
            <input id="cp-city" name="departureCity" defaultValue="Mumbai" className="field" />
          </div>
          {isPilgrimage(service) ? (
            <>
              <div>
                <label htmlFor="cp-makkah" className="label">Nights in Makkah</label>
                <select id="cp-makkah" name="nightsMakkah" defaultValue="" className="field appearance-none">
                  <option value="">Select nights</option>
                  {range(1, 20).map((n) => <option key={n} value={n}>{n} night{n === 1 ? "" : "s"}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cp-madinah" className="label">Nights in Madinah</label>
                <select id="cp-madinah" name="nightsMadinah" defaultValue="" className="field appearance-none">
                  <option value="">Select nights</option>
                  {range(0, 15).map((n) => <option key={n} value={n}>{n} night{n === 1 ? "" : "s"}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="cp-nights" className="label">Number of nights</label>
                <select id="cp-nights" name="nights" defaultValue="" className="field appearance-none">
                  <option value="">Select nights</option>
                  {range(2, 30).map((n) => <option key={n} value={n}>{n} nights</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cp-places" className="label">Places to visit</label>
                <input id="cp-places" name="places" placeholder={service === "Iraq Ziyarat" ? "Karbala, Najaf, Kadhimiya…" : "e.g. Istanbul, Bursa"} className="field" />
              </div>
            </>
          )}
          <div>
            <label htmlFor="cp-flights" className="label">Flights</label>
            <select id="cp-flights" name="flights" className="field appearance-none">
              <option>Include return flights</option>
              <option>Land package only (I&apos;ll book flights)</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className={legend}>Hotels &amp; rooms</legend>
        <div className={fieldset}>
          <div>
            <label htmlFor="cp-hotel" className="label">Hotel type</label>
            <select id="cp-hotel" name="hotel" defaultValue="4 Star" className="field appearance-none">
              {hotelTypes.map((h) => <option key={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cp-sharing" className="label">Room sharing</label>
            <select id="cp-sharing" name="sharing" defaultValue="Quad (4 sharing)" className="field appearance-none">
              {sharingTypes.map((h) => <option key={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cp-budget" className="label">Budget <span className="font-normal text-muted">(per person)</span></label>
            <select id="cp-budget" value={budget} onChange={(e) => setBudget(e.target.value)} className="field appearance-none">
              <option value="">Select budget</option>
              {budgets.map((b) => <option key={b}>{b}</option>)}
              <option value={CUSTOM_BUDGET}>Custom</option>
            </select>
          </div>
          {budget === CUSTOM_BUDGET && (
            <div>
              <label htmlFor="cp-custom-budget" className="label">Your budget (₹ per person)</label>
              <input id="cp-custom-budget" name="customBudget" inputMode="numeric" maxLength={20} placeholder="e.g. 2,50,000" className="field" />
            </div>
          )}
          <div>
            <label htmlFor="cp-nationality" className="label">Nationality</label>
            <input id="cp-nationality" name="nationality" defaultValue="Indian" className="field" />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className={legend}>Who&apos;s travelling</legend>
        <div className={fieldset}>
          <div>
            <label htmlFor="cp-adults" className="label">Adults</label>
            <select id="cp-adults" name="adults" defaultValue="2" className="field appearance-none">
              {range(1, 40).map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cp-children" className="label">Children <span className="font-normal text-muted">(2–11)</span></label>
            <select id="cp-children" name="children" defaultValue="0" className="field appearance-none">
              {range(0, 20).map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cp-infants" className="label">Infants <span className="font-normal text-muted">(under 2)</span></label>
            <select id="cp-infants" name="infants" defaultValue="0" className="field appearance-none">
              {range(0, 10).map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className={legend}>Your details</legend>
        <div className={fieldset}>
          <div>
            <label htmlFor="cp-name" className="label">Full name</label>
            <input id="cp-name" name="name" autoComplete="name" required className="field" />
          </div>
          <div>
            <label htmlFor="cp-phone" className="label">Phone / WhatsApp</label>
            <input id="cp-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+91 98XXX XXXXX" className="field" />
          </div>
          <div>
            <label htmlFor="cp-email" className="label">Email <span className="font-normal text-muted">(optional)</span></label>
            <input id="cp-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="field" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="cp-comments" className="label">Anything else? <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="cp-comments" name="comments" rows={3} maxLength={800} placeholder="Specific hotels, wheelchair assistance, extra ziyarat, budget…" className="field resize-none" />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">No payment now. We&apos;ll send a personalised quote, usually within one working day.</p>
        <button type="submit" disabled={state.sending} className="btn btn-primary w-full shrink-0 disabled:opacity-70 sm:w-auto">
          {state.sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {state.sending ? "Sending…" : "Get my custom quote"}
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm font-medium text-brand">{state.error}</p>}
    </form>
  );
}
