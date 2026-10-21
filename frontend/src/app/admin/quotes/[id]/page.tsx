"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, CheckCircle2, Copy, ExternalLink, Loader2, Mail, Trash2, XCircle } from "lucide-react";
import { formatINR, formatTravelMonth } from "@dilruba/shared/booking";
import { formatDay, type AdminQuote } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { WhatsAppIcon } from "@/components/icons";
import { QuoteEditor } from "@/components/admin/quote-editor";
import { Card, ErrorBox, Field, Loading, PageHeader, QuoteBadge, customerWhatsapp, formatDate } from "@/components/admin/ui";

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: q, setData, error, reload } = useAdminData<AdminQuote>(`/quotes/${id}`);
  const action = useAction();
  const [flash, setFlash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!q) return <Loading />;

  const locked = q.bookingId !== null;

  async function send(email: boolean) {
    setFlash(null);
    const updated = await action.run(() => adminFetch<AdminQuote>(`/quotes/${id}/send`, { method: "POST", body: { email } }));
    if (updated) {
      setData(updated);
      if (email) setFlash(`Quote emailed to ${updated.customer.email}.`);
    }
    return updated;
  }

  const whatsappText = `Assalamu Alaikum ${q.customer.name.split(" ")[0]}, your quote for ${q.title} is ready: ${formatINR(q.total)}${q.validUntil ? `, valid until ${formatDay(q.validUntil)}` : ""}.\n\nSee the full details and accept it here:\n${q.link}\n\nDilruba Travels`;

  return (
    <>
      <PageHeader
        back={q.leadId ? { href: `/admin/leads/${q.leadId}`, label: q.customer.name } : { href: "/admin/quotes", label: "Quotes" }}
        title={`Quote ${q.reference}`}
        subtitle={<>{q.customer.name} · {formatINR(q.total)} · created {formatDate(q.createdAt)}{q.createdBy ? ` by ${q.createdBy}` : ""} · <QuoteBadge status={q.status} /></>}
        actions={
          q.bookingId ? (
            <Link href={`/admin/bookings/${q.bookingId}`} className="btn btn-primary !py-2">Open booking</Link>
          ) : null
        }
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
      {flash && <p role="status" className="mb-4 rounded-xl bg-[#25d366]/10 px-4 py-3 text-sm font-medium text-[#0f7a3a]">{flash}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div>
          {locked ? (
            <Card title="Accepted quote">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Trip">{q.title}</Field>
                <Field label="Travel">{formatTravelMonth(q.travelMonth)}</Field>
                <Field label="Travellers">{q.adults} adults, {q.children} children</Field>
                <Field label="Total">{formatINR(q.total)}</Field>
              </div>
              <ul className="mt-4 divide-y divide-line border-t border-line text-sm">
                {q.items.map((i, n) => (
                  <li key={n} className="flex justify-between gap-3 py-2">
                    <span>{i.label} × {i.quantity}</span>
                    <span className="font-medium">{formatINR(i.quantity * i.unitPrice)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">This quote is now a booking. Change prices on the booking.</p>
            </Card>
          ) : (
            <QuoteEditor key={q.id + q.createdAt} quote={q} onSaved={(u) => { setData(u); setFlash("Quote saved."); }} />
          )}
        </div>

        <div className="space-y-6">
          {!locked && (
            <Card title="Send to the customer">
              <div className="grid gap-2">
                <button type="button" disabled={action.busy || !q.customer.email} onClick={() => void send(true)} className="btn btn-primary disabled:opacity-50">
                  {action.busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
                  {q.status === "draft" ? "Email the quote" : "Email it again"}
                </button>
                <a
                  href={customerWhatsapp(q.customer.phone, whatsappText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { if (q.status === "draft") void send(false); }}
                  className="btn btn-whatsapp"
                >
                  <WhatsAppIcon className="size-4" /> Send on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(q.link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    if (q.status === "draft") void send(false);
                  }}
                  className="btn btn-outline"
                >
                  {copied ? <Check className="size-4 text-[#0f7a3a]" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? "Copied" : "Copy quote link"}
                </button>
                {q.status !== "draft" && (
                  <a href={q.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 py-1 text-sm text-muted hover:text-ink">
                    <ExternalLink className="size-4" aria-hidden /> See what the customer sees
                  </a>
                )}
              </div>
              {!q.customer.email && <p className="mt-2 text-xs text-muted">No email on file: share it on WhatsApp, or add their email on the customer page.</p>}
              {q.status === "draft" && <p className="mt-2 text-xs text-muted">Save your changes first. Sharing marks the quote as sent and the lead as quoted.</p>}
            </Card>
          )}

          {!locked && q.status !== "draft" && (
            <Card title="Customer's answer">
              <p className="mb-3 text-sm text-muted">They can accept online. If they said yes on the phone, record it here: a booking is created at this price.</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      const { bookingId } = await adminFetch<{ bookingId: number }>(`/quotes/${id}/accept`, { method: "POST" });
                      router.push(`/admin/bookings/${bookingId}`);
                    })
                  }
                  className="btn btn-outline disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4 text-[#0f7a3a]" aria-hidden /> Accepted: create booking
                </button>
                {q.status !== "declined" && (
                  <button
                    type="button"
                    disabled={action.busy}
                    onClick={async () => {
                      const u = await action.run(() => adminFetch<AdminQuote>(`/quotes/${id}/decline`, { method: "POST" }));
                      if (u) setData(u);
                    }}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    <XCircle className="size-4 text-brand" aria-hidden /> Declined
                  </button>
                )}
              </div>
            </Card>
          )}

          <Card title="History">
            <div className="grid gap-3">
              <Field label="Created">{formatDate(q.createdAt, true)}</Field>
              <Field label="Sent">{q.sentAt ? formatDate(q.sentAt, true) : "Not yet"}</Field>
              <Field label="Answered">{q.respondedAt ? formatDate(q.respondedAt, true) : "—"}</Field>
            </div>
            {q.status === "draft" && (
              <button
                type="button"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await adminFetch(`/quotes/${id}`, { method: "DELETE" });
                    router.replace(q.leadId ? `/admin/leads/${q.leadId}` : "/admin/quotes");
                  })
                }
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand"
              >
                <Trash2 className="size-4" aria-hidden /> Delete draft
              </button>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
