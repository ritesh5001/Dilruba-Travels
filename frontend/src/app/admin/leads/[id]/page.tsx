"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2, Phone } from "lucide-react";
import { formatTravelMonth, leadStatuses, leadStatusLabels, type LeadStatus } from "@dilruba/shared/booking";
import type { AdminLeadDetail } from "@dilruba/shared/crm";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { WhatsAppIcon } from "@/components/icons";
import { BookingBadge, Card, ErrorBox, Field, LeadBadge, Loading, NotesPanel, PageHeader, customerWhatsapp, formatDate } from "@/components/admin/ui";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: lead, setData, error, reload } = useAdminData<AdminLeadDetail>(`/leads/${id}`);
  const action = useAction();

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!lead) return <Loading />;

  const setStatus = async (status: LeadStatus) => {
    const updated = await action.run(() => adminFetch<AdminLeadDetail>(`/leads/${id}`, { method: "PATCH", body: { status } }));
    if (updated) setData(updated);
  };

  const convert = () =>
    action.run(async () => {
      const { bookingId } = await adminFetch<{ bookingId: number }>(`/leads/${id}/convert`, { method: "POST" });
      router.push(`/admin/bookings/${bookingId}`);
    });

  return (
    <>
      <PageHeader
        back={{ href: "/admin/leads", label: "Leads" }}
        title={lead.customer.name}
        subtitle={<>Enquiry #{lead.id} · received {formatDate(lead.createdAt, true)} · <LeadBadge status={lead.status} /></>}
        actions={
          <>
            <a href={customerWhatsapp(lead.customer.phone, `Assalamu Alaikum ${lead.customer.name.split(" ")[0]}, this is Dilruba Travels regarding your enquiry.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp !py-2">
              <WhatsAppIcon className="size-4" /> WhatsApp
            </a>
            <a href={`tel:${lead.customer.phone}`} className="btn btn-outline !py-2"><Phone className="size-4" aria-hidden /> Call</a>
            {lead.status !== "converted" && (
              <button type="button" onClick={convert} disabled={action.busy} className="btn btn-primary !py-2 disabled:opacity-60">
                {action.busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRightLeft className="size-4" aria-hidden />} Convert to booking
              </button>
            )}
          </>
        }
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title="Enquiry">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Interested in">{lead.packageName ?? `${lead.service}${lead.option ? ` – ${lead.option}` : ""}`}</Field>
              <Field label="Travel month">{formatTravelMonth(lead.travelMonth)}</Field>
              <Field label="Travellers">{lead.travellers ?? "—"}</Field>
              <Field label="Form">{lead.source ?? "—"}</Field>
              <div className="sm:col-span-2"><Field label="Message"><span className="whitespace-pre-wrap">{lead.message ?? "—"}</span></Field></div>
            </div>
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
          <Card title="Status">
            <label htmlFor="lead-status" className="sr-only">Lead status</label>
            <select id="lead-status" value={lead.status} disabled={action.busy} onChange={(e) => setStatus(e.target.value as LeadStatus)} className="field appearance-none">
              {leadStatuses.map((s) => (
                <option key={s} value={s}>{leadStatusLabels[s]}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted">New → Contacted → Quoted → Converted (booked) or Lost.</p>
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
