"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { enquirySchema, enquiryToWhatsapp, services, type Enquiry } from "@dilruba/shared/enquiry";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

type Service = (typeof services)[number];
type Status = { state: "idle" | "sending" | "done" } | { state: "error"; message: string };

const heroTabs: { label: string; service: Service; options: string[] }[] = [
  { label: "Umrah", service: "Umrah", options: ["Economy", "Standard", "Premium", "Ramadan Umrah"] },
  { label: "Hajj", service: "Hajj", options: ["Hajj 2027", "Pre-registration"] },
  { label: "Ziyarat", service: "Iraq Ziyarat", options: ["Iraq Ziyarat", "Jordan", "Palestine (Al-Aqsa)", "Turkey"] },
  { label: "Holidays", service: "Asia Holiday", options: ["Asia Holiday", "India Holiday"] },
];

// The ziyarat and holiday chips map directly onto a service of their own.
function resolveService(tab: (typeof heroTabs)[number], option: string): Service {
  return (services as readonly string[]).includes(option) ? (option as Service) : tab.service;
}

function useSubmit(source: string, onSent?: () => void) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [sent, setSent] = useState<Partial<Enquiry>>({});

  async function submit(data: Record<string, unknown>) {
    const parsed = enquirySchema.safeParse({ ...data, source });
    if (!parsed.success) {
      setStatus({ state: "error", message: parsed.error.issues[0]?.message ?? "Please check the form" });
      return;
    }
    setStatus({ state: "sending" });
    setSent(parsed.data);
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error();
      setStatus({ state: "done" });
      onSent?.();
    } catch {
      setStatus({
        state: "error",
        message: "We couldn't send that right now. Please tap WhatsApp below and we'll reply quickly.",
      });
    }
  }

  return { status, sent, submit, reset: () => setStatus({ state: "idle" }) };
}

function formValues(form: HTMLFormElement) {
  const data = Object.fromEntries(new FormData(form).entries());
  // Drop empty optional fields so they validate as "not provided".
  for (const key of Object.keys(data)) if (data[key] === "") delete data[key];
  return data;
}

function Success({ sent, onReset, dark }: { sent: Partial<Enquiry>; onReset: () => void; dark?: boolean }) {
  return (
    <div className="flex flex-col items-center py-6 text-center" role="status">
      <CheckCircle2 className="size-12 text-[#25d366]" aria-hidden />
      <h3 className={`mt-3 text-2xl font-semibold ${dark ? "text-white" : "text-ink"}`}>
        Thank you{sent.name ? `, ${sent.name.split(" ")[0]}` : ""}!
      </h3>
      <p className={`mt-2 max-w-md text-sm ${dark ? "text-white/75" : "text-muted"}`}>
        We&apos;ve received your enquiry and will send your personalised quote shortly. For the fastest reply,
        continue on WhatsApp.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <a
          href={whatsappLink(enquiryToWhatsapp(sent))}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp"
        >
          <WhatsAppIcon className="size-4" /> Continue on WhatsApp
        </a>
        <button type="button" onClick={onReset} className={`btn ${dark ? "btn-white" : "btn-outline"}`}>
          New enquiry
        </button>
      </div>
    </div>
  );
}

function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

function ErrorText({ status }: { status: Status }) {
  if (status.state !== "error") return null;
  return (
    <p role="alert" className="text-sm font-medium text-brand">
      {status.message}
    </p>
  );
}

function SubmitButton({ status, label = "Get Free Quote" }: { status: Status; label?: string }) {
  const sending = status.state === "sending";
  return (
    <button type="submit" disabled={sending} className="btn btn-primary w-full disabled:opacity-70 sm:w-auto">
      {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
      {sending ? "Sending…" : label}
    </button>
  );
}

const travellerOptions = Array.from({ length: 10 }, (_, i) => i + 1);

/** Hero card: tabs + chips + four fields in a row, mirroring the reference's search card. */
export function HeroEnquiryCard() {
  const [tabIndex, setTabIndex] = useState(0);
  const tab = heroTabs[tabIndex];
  const [option, setOption] = useState(tab.options[0]);
  const { status, sent, submit, reset } = useSubmit("Homepage hero");

  const selectTab = (i: number) => {
    setTabIndex(i);
    setOption(heroTabs[i].options[0]);
  };

  return (
    <div className="rounded-[1.75rem] bg-white p-5 text-ink shadow-2xl shadow-black/20 sm:p-6">
      {status.state === "done" ? (
        <Success sent={sent} onReset={reset} />
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit({ ...formValues(e.currentTarget), service: resolveService(tab, option), option });
          }}
          className="relative"
        >
          <Honeypot />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-semibold sm:text-2xl">Plan your sacred journey</h2>
            <div role="tablist" aria-label="Journey type" className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-sand p-1">
              {heroTabs.map((t, i) => (
                <button
                  key={t.label}
                  type="button"
                  role="tab"
                  aria-selected={i === tabIndex}
                  onClick={() => selectTab(i)}
                  className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                    i === tabIndex ? "bg-white text-ink shadow-sm" : "text-ink/65 hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="hero-name" className="label">Your name</label>
              <input id="hero-name" name="name" autoComplete="name" required placeholder="Full name" className="field" />
            </div>
            <div>
              <label htmlFor="hero-phone" className="label">Phone / WhatsApp</label>
              <input
                id="hero-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="+91 98XXX XXXXX"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="hero-month" className="label">Travel month</label>
              <input id="hero-month" name="travelMonth" type="month" className="field" />
            </div>
            <div>
              <label htmlFor="hero-travellers" className="label">Travellers</label>
              <select id="hero-travellers" name="travellers" defaultValue="2" className="field appearance-none">
                {travellerOptions.map((n) => (
                  <option key={n} value={n}>
                    {n === 10 ? "10+ (group)" : `${n} ${n === 1 ? "person" : "people"}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Interested in:</span>
              {tab.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={o === option}
                  onClick={() => setOption(o)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    o === option ? "border-ink bg-ink text-white" : "border-line text-ink/75 hover:border-ink"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <SubmitButton status={status} />
          </div>
          <div className="mt-3">
            <ErrorText status={status} />
          </div>
        </form>
      )}
    </div>
  );
}

/** Stacked form for the contact page, CTA band and package pages. */
export function EnquiryForm({
  source,
  packageName,
  defaultService = "Umrah",
  dark,
  onSent,
}: {
  source: string;
  packageName?: string;
  defaultService?: Service;
  dark?: boolean;
  /** Called once the enquiry has been saved. */
  onSent?: () => void;
}) {
  const { status, sent, submit, reset } = useSubmit(source, onSent);
  const id = (name: string) => `${source.replace(/\W+/g, "-").toLowerCase()}-${name}`;
  const labelClass = `label ${dark ? "!text-white" : ""}`;

  if (status.state === "done") return <Success sent={sent} onReset={reset} dark={dark} />;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit({ ...formValues(e.currentTarget), packageName });
      }}
      className="relative grid gap-4 sm:grid-cols-2"
    >
      <Honeypot />
      <div>
        <label htmlFor={id("name")} className={labelClass}>Your name</label>
        <input id={id("name")} name="name" autoComplete="name" required placeholder="Full name" className="field" />
      </div>
      <div>
        <label htmlFor={id("phone")} className={labelClass}>Phone / WhatsApp</label>
        <input
          id={id("phone")}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="+91 98XXX XXXXX"
          className="field"
        />
      </div>
      <div className={packageName ? "hidden" : ""}>
        <label htmlFor={id("service")} className={labelClass}>Interested in</label>
        <select id={id("service")} name="service" defaultValue={defaultService} className="field appearance-none">
          {services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={id("month")} className={labelClass}>Travel month</label>
        <input id={id("month")} name="travelMonth" type="month" className="field" />
      </div>
      <div className={packageName ? "" : "sm:col-span-2"}>
        <label htmlFor={id("travellers")} className={labelClass}>Travellers</label>
        <select id={id("travellers")} name="travellers" defaultValue="2" className="field appearance-none">
          {travellerOptions.map((n) => (
            <option key={n} value={n}>
              {n === 10 ? "10+ (group)" : `${n} ${n === 1 ? "person" : "people"}`}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("message")} className={labelClass}>
          Anything else? <span className="font-normal opacity-70">(optional)</span>
        </label>
        <textarea
          id={id("message")}
          name="message"
          rows={3}
          placeholder="Preferred dates, hotel category, special requirements…"
          className="field resize-none"
        />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-xs ${dark ? "text-white/65" : "text-muted"}`}>
          No payment needed. We&apos;ll reply with a personalised quote.
        </p>
        <SubmitButton status={status} label="Send Enquiry" />
      </div>
      <div className="sm:col-span-2">
        <ErrorText status={status} />
      </div>
    </form>
  );
}
