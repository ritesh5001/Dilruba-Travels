"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { bookingStatusLabels, leadStatusLabels, type BookingStatus, type LeadStatus } from "@dilruba/shared/booking";
import type { AdminNote } from "@dilruba/shared/crm";
import { quoteStatusLabels, visaStatusLabels, type InstalmentState, type QuoteStatus, type VisaStatus } from "@dilruba/shared/ops";
import { WhatsAppIcon } from "@/components/icons";

export function formatDate(iso: string, withTime = false) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/** Opens a WhatsApp chat with a customer (not the business number). */
export function customerWhatsapp(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

const tone = {
  neutral: "bg-ink/5 text-ink",
  amber: "bg-amber/25 text-ink",
  blue: "bg-[#2563eb]/10 text-[#1d4ed8]",
  green: "bg-[#25d366]/15 text-[#0f7a3a]",
  red: "bg-brand/10 text-brand",
} as const;

const bookingTone: Record<BookingStatus, keyof typeof tone> = {
  requested: "amber",
  awaiting_payment: "blue",
  confirmed: "green",
  completed: "neutral",
  cancelled: "red",
};

const leadTone: Record<LeadStatus, keyof typeof tone> = {
  new: "amber",
  contacted: "blue",
  quoted: "blue",
  converted: "green",
  lost: "red",
};

const quoteTone: Record<QuoteStatus, keyof typeof tone> = { draft: "neutral", sent: "blue", accepted: "green", declined: "red", expired: "amber" };
const visaTone: Record<VisaStatus, keyof typeof tone> = { not_started: "neutral", documents_pending: "amber", submitted: "blue", approved: "green", rejected: "red" };
const instalmentTone: Record<InstalmentState, keyof typeof tone> = { paid: "green", part_paid: "blue", due: "neutral", overdue: "red" };
const instalmentLabels: Record<InstalmentState, string> = { paid: "Paid", part_paid: "Part paid", due: "Due", overdue: "Overdue" };

export function Badge({ children, color = "neutral" }: { children: React.ReactNode; color?: keyof typeof tone }) {
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[color]}`}>{children}</span>;
}

export function QuoteBadge({ status }: { status: QuoteStatus }) {
  return <Badge color={quoteTone[status]}>{quoteStatusLabels[status]}</Badge>;
}

export function VisaBadge({ status }: { status: VisaStatus }) {
  return <Badge color={visaTone[status]}>{visaStatusLabels[status]}</Badge>;
}

export function InstalmentBadge({ state }: { state: InstalmentState }) {
  return <Badge color={instalmentTone[state]}>{instalmentLabels[state]}</Badge>;
}

/** Link to an admin CSV export (the session cookie goes with it). */
export const exportUrl = (path: string) => `/api/admin/reports/export/${path}`;

/** A WhatsApp button with ready-made messages: pick one, it opens the chat with the text filled in. */
export function WhatsAppTemplates({ phone, templates }: { phone: string; templates: { label: string; text: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn btn-whatsapp !py-2">
        <WhatsAppIcon className="size-4" /> WhatsApp <ChevronDown className="size-4" aria-hidden />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl shadow-black/10">
            {templates.map((t) => (
              <li key={t.label}>
                <a
                  href={customerWhatsapp(phone, t.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm hover:bg-sand"
                >
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function BookingBadge({ status }: { status: BookingStatus }) {
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[bookingTone[status]]}`}>{bookingStatusLabels[status]}</span>;
}

export function LeadBadge({ status }: { status: LeadStatus }) {
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[leadTone[status]]}`}>{leadStatusLabels[status]}</span>;
}

export function PageHeader({ title, subtitle, back, actions }: { title: string; subtitle?: React.ReactNode; back?: { href: string; label: string }; actions?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Loading() {
  return (
    <div className="flex items-center gap-2 py-16 text-sm text-muted" aria-busy="true">
      <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-outline !bg-white !py-1.5 text-ink">
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted">{children}</p>;
}

/** Status tabs + search box that write to the URL (?status=&q=&page=). */
export function ListFilters({ statuses }: { statuses: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("status") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");

  function go(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`);
  }

  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
        {[{ value: "", label: "All" }, ...statuses].map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => go({ status: s.value })}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              current === s.value ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-line hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: q.trim() });
        }}
        className="relative lg:w-80"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, reference…"
          aria-label="Search"
          className="field !pl-10"
        />
      </form>
    </div>
  );
}

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-4 text-sm text-muted">{total} total</p>;
  const go = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    router.replace(`${pathname}?${sp}`);
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>
        {total} total · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => go(page - 1)} className="btn btn-outline !px-3 !py-1.5 disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button type="button" disabled={page >= pages} onClick={() => go(page + 1)} className="btn btn-outline !px-3 !py-1.5 disabled:opacity-40" aria-label="Next page">
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Timeline of staff notes and automatic events, with a box to add a note. */
export function NotesPanel({ notes, onAdd, readOnly }: { notes: AdminNote[]; onAdd: (body: string) => Promise<boolean>; readOnly?: boolean }) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Card title="Notes & activity">
      {!readOnly && (
        <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim()) return;
          setSaving(true);
          if (await onAdd(body.trim())) setBody("");
          setSaving(false);
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="note-body" className="sr-only">Add a note</label>
        <textarea id="note-body" value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Add a note (call summary, documents received…)" className="field resize-none" />
        <button type="submit" disabled={saving || !body.trim()} className="btn btn-primary self-end !py-2 disabled:opacity-50">
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />} Add note
        </button>
      </form>
      )}
      {notes.length === 0 ? (
        <Empty>No notes yet.</Empty>
      ) : (
        <ol className="mt-4 space-y-3 border-t border-line pt-4">
          {notes.map((n) => (
            <li key={n.id} className={`rounded-xl px-3 py-2.5 text-sm ${n.kind === "note" ? "bg-cream ring-1 ring-line" : "text-muted"}`}>
              <p className="whitespace-pre-wrap">{n.body}</p>
              <p className="mt-1 text-xs text-muted">
                {n.kind === "note" ? "Note" : "Activity"}{n.author && n.kind === "note" ? ` by ${n.author}` : ""} · {formatDate(n.createdAt, true)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-0.5 text-sm font-medium break-words">{children}</div>
    </div>
  );
}
