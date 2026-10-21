"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRightLeft, BellRing, FilePlus2, Gift, Loader2, Phone } from "lucide-react";
import { formatINR, formatTravelMonth, leadStatuses, leadStatusLabels, type LeadStatus } from "@dilruba/shared/booking";
import type { AdminLeadDetail, StaffRef } from "@dilruba/shared/crm";
import { lostReasons } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { leadTemplates } from "@/lib/whatsapp-templates";
import { BookingBadge, Card, Empty, ErrorBox, Field, LeadBadge, Loading, NotesPanel, PageHeader, QuoteBadge, WhatsAppTemplates, formatDate } from "@/components/admin/ui";

/** "2026-10-22T10:00" in the browser's time zone, for <input type="datetime-local">. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d;
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: lead, setData, error, reload } = useAdminData<AdminLeadDetail>(`/leads/${id}`);
  const { data: team } = useAdminData<StaffRef[]>("/team");
  const action = useAction();

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!lead) return <Loading />;

  const update = async (body: Record<string, unknown>) => {
    const updated = await action.run(() => adminFetch<AdminLeadDetail>(`/leads/${id}`, { method: "PATCH", body }));
    if (updated) setData(updated);
    return !!updated;
  };

  const convert = () =>
    action.run(async () => {
      const { bookingId } = await adminFetch<{ bookingId: number }>(`/leads/${id}/convert`, { method: "POST" });
      router.push(`/admin/bookings/${bookingId}`);
    });

  const open = lead.status !== "converted" && lead.status !== "lost";
  const sentQuote = lead.quotes.find((q) => q.status === "sent");

  return (
    <>
      <PageHeader
        back={{ href: "/admin/leads", label: "Leads" }}
        title={lead.customer.name}
        subtitle={<>Enquiry #{lead.id} · received {formatDate(lead.createdAt, true)} · <LeadBadge status={lead.status} /></>}
        actions={
          <>
            <WhatsAppTemplates phone={lead.customer.phone} templates={leadTemplates(lead, sentQuote?.link)} />
            <a href={`tel:${lead.customer.phone}`} className="btn btn-outline !py-2"><Phone className="size-4" aria-hidden /> Call</a>
            {open && (
              <Link href={`/admin/quotes/new?lead=${lead.id}`} className="btn btn-outline !py-2">
                <FilePlus2 className="size-4" aria-hidden /> New quote
              </Link>
            )}
            {lead.status !== "converted" && (
              <button type="button" onClick={convert} disabled={action.busy} className="btn btn-primary !py-2 disabled:opacity-60">
                {action.busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRightLeft className="size-4" aria-hidden />} Convert to booking
              </button>
            )}
          </>
        }
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card title="Enquiry">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Interested in">{lead.packageName ?? `${lead.service}${lead.option ? ` – ${lead.option}` : ""}`}</Field>
              <Field label="Travel month">{formatTravelMonth(lead.travelMonth)}</Field>
              <Field label="Travellers">{lead.travellers ?? "—"}</Field>
              <Field label="Came from">{lead.source ?? "—"}</Field>
              {lead.referredBy && (
                <Field label="Referred by">
                  <Link href={`/admin/customers/${lead.referredBy.id}`} className="inline-flex items-center gap-1 hover:text-brand">
                    <Gift className="size-4 text-gold" aria-hidden /> {lead.referredBy.name}
                  </Link>
                </Field>
              )}
              <div className="sm:col-span-2"><Field label="Message"><span className="whitespace-pre-wrap">{lead.message ?? "—"}</span></Field></div>
            </div>
          </Card>

          <Card
            title="Quotes"
            actions={open && <Link href={`/admin/quotes/new?lead=${lead.id}`} className="text-sm font-medium text-brand">New quote</Link>}
          >
            {lead.quotes.length === 0 ? (
              <Empty>No quotes yet. Send a written quote the customer can accept online.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {lead.quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/admin/quotes/${q.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{q.reference} · {q.title}</p>
                        <p className="text-sm text-muted">{formatINR(q.total)} · {formatDate(q.createdAt)}{q.createdBy ? ` · ${q.createdBy}` : ""}</p>
                      </div>
                      <QuoteBadge status={q.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <NotesPanel
            notes={lead.notes}
            onAdd={async (body) => {
              const updated = await action.run(() => adminFetch<AdminLeadDetail>(`/leads/${id}/notes`, { method: "POST", body: { body } }));
              if (updated) setData(updated);
              return !!updated;
            }}
          />
        </div>

        <div className="space-y-6">
          {open && <FollowUpCard key={`${lead.followUpAt}-${lead.followUpNote}`} lead={lead} busy={action.busy} onSave={update} />}
          <StatusCard key={lead.status} lead={lead} busy={action.busy} onSave={update} />
          <Card title="Assigned to">
            <label htmlFor="lead-assign" className="sr-only">Assigned to</label>
            <select
              id="lead-assign"
              value={lead.assignedTo?.id ?? ""}
              disabled={action.busy}
              onChange={(e) => void update({ assignedTo: e.target.value ? Number(e.target.value) : null })}
              className="field appearance-none"
            >
              <option value="">Nobody</option>
              {lead.assignedTo && !team?.some((t) => t.id === lead.assignedTo!.id) && <option value={lead.assignedTo.id}>{lead.assignedTo.name}</option>}
              {team?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {team?.length === 0 && <p className="mt-2 text-xs text-muted">Add staff accounts under Staff to share leads with your team.</p>}
          </Card>
          <Card title="Customer">
            <div className="grid gap-3">
              <Field label="Name"><Link href={`/admin/customers/${lead.customer.id}`} className="hover:text-brand">{lead.customer.name}</Link></Field>
              <Field label="Phone">{lead.customer.phone}</Field>
              <Field label="Email">{lead.customer.email ?? "—"}</Field>
            </div>
          </Card>
          {lead.bookings.length > 0 && (
            <Card title="Bookings from this lead">
              <ul className="space-y-2">
                {lead.bookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/bookings/${b.id}`} className="font-medium hover:text-brand">{b.reference}</Link>
                    <BookingBadge status={b.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function FollowUpCard({ lead, busy, onSave }: { lead: AdminLeadDetail; busy: boolean; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [when, setWhen] = useState(lead.followUpAt ? toLocalInput(new Date(lead.followUpAt)) : "");
  const [note, setNote] = useState(lead.followUpNote ?? "");
  const save = (date: Date | null) => void onSave({ followUpAt: date ? date.toISOString() : null, followUpNote: date ? note.trim() || null : null });
  const due = lead.followUpAt && lead.followUpAt <= new Date().toISOString();

  return (
    <Card title="Next follow-up">
      {lead.followUpAt && (
        <p className={`mb-3 flex items-center gap-1.5 text-sm font-medium ${due ? "text-brand" : ""}`}>
          <BellRing className="size-4" aria-hidden /> {due ? "Due" : "Set for"} {formatDate(lead.followUpAt, true)}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {[
          ["Tomorrow", 1],
          ["In 3 days", 3],
          ["Next week", 7],
        ].map(([label, days]) => (
          <button key={label} type="button" disabled={busy} onClick={() => save(inDays(days as number))} className="rounded-full bg-sand px-3 py-1 text-sm hover:bg-line disabled:opacity-50">
            {label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (when) save(new Date(when));
        }}
        className="mt-3 grid gap-2"
      >
        <label htmlFor="fu-when" className="sr-only">Follow-up date and time</label>
        <input id="fu-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="field" />
        <label htmlFor="fu-note" className="sr-only">What to do</label>
        <input id="fu-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to do, e.g. call about room sharing" maxLength={300} className="field" />
        <div className="flex gap-2">
          <button type="submit" disabled={busy || !when} className="btn btn-outline flex-1 !py-2 disabled:opacity-50">Set follow-up</button>
          {lead.followUpAt && (
            <button type="button" disabled={busy} onClick={() => save(null)} className="btn btn-outline !py-2 disabled:opacity-50">Done</button>
          )}
        </div>
      </form>
      <p className="mt-2 text-xs text-muted">Due follow-ups show on the dashboard and in the morning email.</p>
    </Card>
  );
}

function StatusCard({ lead, busy, onSave }: { lead: AdminLeadDetail; busy: boolean; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [reason, setReason] = useState(lead.lostReason ?? "");
  const changed = status !== lead.status || (status === "lost" && reason !== (lead.lostReason ?? ""));

  return (
    <Card title="Status">
      <label htmlFor="lead-status" className="sr-only">Lead status</label>
      <select id="lead-status" value={status} disabled={busy} onChange={(e) => setStatus(e.target.value as LeadStatus)} className="field appearance-none">
        {leadStatuses.map((s) => (
          <option key={s} value={s}>{leadStatusLabels[s]}</option>
        ))}
      </select>
      {status === "lost" && (
        <div className="mt-3">
          <label htmlFor="lead-lost" className="label">Why was it lost?</label>
          <select id="lead-lost" value={reason} onChange={(e) => setReason(e.target.value)} className="field appearance-none">
            <option value="" disabled>Choose a reason</option>
            {lostReasons.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      )}
      {changed && (
        <button
          type="button"
          disabled={busy || (status === "lost" && !reason)}
          onClick={() => void onSave({ status, ...(status === "lost" ? { lostReason: reason } : {}) })}
          className="btn btn-outline mt-3 w-full disabled:opacity-50"
        >
          Update status
        </button>
      )}
      <p className="mt-2 text-xs text-muted">New → Contacted → Quoted → Converted (booked) or Lost. Lost reasons show in Reports.</p>
    </Card>
  );
}
