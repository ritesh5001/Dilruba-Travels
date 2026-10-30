"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Check, Copy, FileText, Loader2, Mail, Phone } from "lucide-react";
import {
  bookingStatuses,
  bookingStatusLabels,
  formatINR,
  formatTravelMonth,
  paymentMethodLabels,
  paymentMethods,
  type BookingStatus,
} from "@dilruba/shared/booking";
import type { AdminBookingDetail } from "@dilruba/shared/crm";
import { formatDay, type AdminDeparture } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { bookingTemplates } from "@/lib/whatsapp-templates";
import { CostsCard, FeedbackCard, InstalmentsCard, TravellersCard } from "@/components/admin/booking-sections";
import { BookingBadge, Card, Empty, ErrorBox, Field, Loading, NotesPanel, PageHeader, WhatsAppTemplates, formatDate } from "@/components/admin/ui";
import { useCan } from "@/components/admin/shell";

const rupees = (paise: number | null) => (paise === null ? "" : String(paise / 100));

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: b, setData, error, reload } = useAdminData<AdminBookingDetail>(`/bookings/${id}`);
  const action = useAction();
  const can = useCan();
  const [flash, setFlash] = useState<string | null>(null);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!b) return <Loading />;
  const cancelled = b.status === "cancelled";
  // What can still be given back after a cancellation.
  const refundable = b.amountPaid - b.refundedAmount;

  async function mutate(path: string, method: string, body?: unknown, message?: string) {
    setFlash(null);
    const updated = await action.run(() => adminFetch<AdminBookingDetail>(`/bookings/${id}${path}`, { method, body }));
    if (updated) {
      setData(updated);
      if (message) setFlash(message);
    }
    return !!updated;
  }

  return (
    <>
      <PageHeader
        back={{ href: "/admin/bookings", label: "Bookings" }}
        title={`${b.reference} · ${b.customer.name}`}
        subtitle={<>{b.packageTitle} · created {formatDate(b.createdAt, true)} · <BookingBadge status={b.status} /></>}
        actions={
          <>
            <WhatsAppTemplates phone={b.customer.phone} templates={bookingTemplates(b)} />
            <a href={`tel:${b.customer.phone}`} className="btn btn-outline !py-2"><Phone className="size-4" aria-hidden /> Call</a>
            {b.totalAmount !== null && (
              <Link href={`/admin/bookings/${b.id}/invoice`} className="btn btn-outline !py-2">
                <FileText className="size-4" aria-hidden /> {b.invoiceNumber ? "Invoice" : "Invoice / receipt"}
              </Link>
            )}
          </>
        }
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
      {flash && <p role="status" className="mb-4 rounded-xl bg-[#25d366]/10 px-4 py-3 text-sm font-medium text-[#0f7a3a]">{flash}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-6">
          {(can("payments.write") || can("bookings.write")) && <PricingCard key={`${b.tcsAmount}-${b.departure?.id}`} b={b} busy={action.busy} onSave={(body) => mutate("", "PATCH", body, "Price saved.")} />}

          <Card title="Payments">
            <div className="mb-4 grid gap-4 rounded-xl bg-sand p-4 sm:grid-cols-4">
              <Field label="Total">{formatINR(b.totalAmount)}{b.tcsAmount > 0 && <span className="block text-xs font-normal text-muted">+ {formatINR(b.tcsAmount)} TCS</span>}</Field>
              <Field label="Deposit">{formatINR(b.depositAmount)}</Field>
              <Field label="Paid">{formatINR(b.amountPaid)}</Field>
              {cancelled ? (
                <Field label="Refunded">
                  {formatINR(b.refundedAmount)}
                  {b.amountPaid > 0 && <span className="block text-xs font-normal text-muted">{refundable > 0 ? `${formatINR(refundable)} kept so far` : "Fully refunded"}</span>}
                </Field>
              ) : (
                <Field label="Balance">{b.totalAmount === null ? "—" : formatINR(Math.max(0, b.totalAmount + b.tcsAmount - b.amountPaid))}</Field>
              )}
            </div>
            {b.payments.length === 0 ? (
              <Empty>No payments yet.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">How</th>
                      <th className="py-2 pr-3 font-medium">Details</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {b.payments.map((p) => (
                      <tr key={p.id} className={p.status === "failed" ? "text-muted line-through" : p.status === "refunded" ? "text-brand" : ""}>
                        <td className="whitespace-nowrap py-2.5 pr-3">{formatDate(p.paidAt ?? p.createdAt, true)}</td>
                        <td className="py-2.5 pr-3">
                          {p.status === "refunded" && "Refund · "}
                          {p.provider === "manual" ? paymentMethodLabels[p.method as keyof typeof paymentMethodLabels] ?? p.method : `Online (${p.method ?? p.provider})`}
                          {p.status === "failed" && " · failed"}
                        </td>
                        <td className="py-2.5 pr-3 text-muted">{p.note ?? p.providerPaymentId ?? "—"}</td>
                        <td className="whitespace-nowrap py-2.5 text-right font-semibold">{p.status === "refunded" ? `− ${formatINR(p.amount)}` : formatINR(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {can("payments.write") && !cancelled && <RecordPayment busy={action.busy} onSave={(body) => mutate("/payments", "POST", body, "Payment recorded.")} />}
            {can("payments.write") && cancelled && refundable > 0 && (
              <RecordRefund key={b.refundedAmount} refundable={refundable} hasEmail={!!b.customer.email} busy={action.busy} onSave={(body) => mutate("/refunds", "POST", body, "Refund recorded.")} />
            )}
          </Card>

          <InstalmentsCard key={`plan-${b.instalments.map((i) => i.id).join()}`} b={b} busy={action.busy} mutate={mutate} />
          <TravellersCard b={b} busy={action.busy} mutate={mutate} />
          {b.costs && <CostsCard b={b} busy={action.busy} mutate={mutate} />}
          <NotesPanel
            readOnly={!can("bookings.write") && !can("payments.write") && !can("travellers.write")}
            notes={b.notes}
            onAdd={(body) => mutate("/notes", "POST", { body })}
          />
        </div>

        <div className="space-y-6">
          {can("payments.write") && <Card title="Payment request">
            {b.totalAmount === null ? (
              <p className="text-sm text-muted">Set the total price first. Then email the customer their price and payment link.</p>
            ) : b.status === "cancelled" || b.status === "completed" ? (
              <p className="text-sm text-muted">This booking is {bookingStatusLabels[b.status].toLowerCase()}.</p>
            ) : (
              <>
                <p className="text-sm">
                  Due now: <strong>{formatINR(b.dueNow || (b.status === "requested" ? (b.depositAmount ?? b.totalAmount) : 0))}</strong>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {b.customer.email ? `Emails ${b.customer.email} with the price and a secure payment link.` : "This customer has no email. Add one on their customer page first."}
                  {!b.onlinePaymentsEnabled && " Online payment isn't configured, so the email asks them to contact you to pay."}
                </p>
                <button
                  type="button"
                  disabled={action.busy || !b.customer.email}
                  onClick={() => mutate("/payment-request", "POST", undefined, "Payment request emailed.")}
                  className="btn btn-primary mt-4 w-full disabled:opacity-50"
                >
                  {action.busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
                  {b.status === "requested" ? "Send price & payment link" : "Resend payment link"}
                </button>
              </>
            )}
            <CopyLink link={b.customerLink} />
          </Card>}
          {!can("payments.write") && (
            <Card title="Customer's booking page">
              <p className="text-sm text-muted">Where the customer sees their booking and pays.</p>
              <CopyLink link={b.customerLink} />
            </Card>
          )}

          {can("bookings.write") && <StatusCard key={b.status} b={b} busy={action.busy} onSave={(status, notifyCustomer) => mutate("", "PATCH", { status, notifyCustomer }, "Status updated.")} />}
          <FeedbackCard b={b} busy={action.busy} mutate={mutate} />

          <Card title="Trip">
            <div className="grid gap-3">
              <Field label="Package">{b.packageSlug && b.packageCategory ? <Link href={`/packages/${b.packageCategory}/${b.packageSlug}`} target="_blank" className="hover:text-brand">{b.packageTitle}</Link> : b.packageTitle}</Field>
              <Field label="Travel month">{formatTravelMonth(b.travelMonth)}</Field>
              {b.departure && <Field label="Group date"><Link href={`/admin/departures/${b.departure.id}`} className="hover:text-brand">{b.departure.title} · {formatDay(b.departure.startDate)}</Link></Field>}
              <Field label="Travellers">{b.adults} adults, {b.children} children</Field>
              {b.quoteId && <Field label="From quote"><Link href={`/admin/quotes/${b.quoteId}`} className="hover:text-brand">View quote</Link></Field>}
              {b.invoiceNumber && <Field label="Invoice">{b.invoiceNumber}</Field>}
              <Field label="Customer notes"><span className="whitespace-pre-wrap">{b.customerNotes ?? "—"}</span></Field>
              {b.leadId && <Field label="From enquiry"><Link href={`/admin/leads/${b.leadId}`} className="hover:text-brand">#{b.leadId}</Link></Field>}
            </div>
          </Card>

          <Card title="Customer">
            <div className="grid gap-3">
              <Field label="Name"><Link href={`/admin/customers/${b.customer.id}`} className="hover:text-brand">{b.customer.name}</Link></Field>
              <Field label="Phone">{b.customer.phone}</Field>
              <Field label="Email">{b.customer.email ?? "—"}</Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function PricingCard({ b, busy, onSave }: { b: AdminBookingDetail; busy: boolean; onSave: (body: unknown) => Promise<boolean> }) {
  const { data: departures } = useAdminData<AdminDeparture[]>("/departures");
  const [tcs, setTcs] = useState(rupees(b.tcsAmount));
  // Controlled: the list loads after the form, and an uncontrolled select would lose its value.
  const [departureId, setDepartureId] = useState(b.departure ? String(b.departure.id) : "");
  return (
    <Card title="Price">
      <form
        key={`${b.totalAmount}-${b.depositAmount}-${b.tcsAmount}-${b.adults}-${b.children}-${b.travelMonth}-${b.departure?.id}`}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const num = (k: string) => (f.get(k) === "" ? null : Number(f.get(k)));
          void onSave({
            totalAmount: num("total"),
            depositAmount: num("deposit"),
            tcsAmount: Number(tcs) || 0,
            adults: Number(f.get("adults")),
            children: Number(f.get("children")),
            travelMonth: f.get("travelMonth") || null,
            departureId: departureId ? Number(departureId) : null,
          });
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="bk-total" className="label">Total price (₹, all travellers)</label>
          <input id="bk-total" name="total" type="number" min="0" step="1" inputMode="numeric" defaultValue={rupees(b.totalAmount)} placeholder="e.g. 285000" className="field" />
        </div>
        <div>
          <label htmlFor="bk-deposit" className="label">Deposit to confirm (₹)</label>
          <input id="bk-deposit" name="deposit" type="number" min="0" step="1" inputMode="numeric" defaultValue={rupees(b.depositAmount)} placeholder="Leave empty to ask for the full amount" className="field" />
        </div>
        <div>
          <label htmlFor="bk-adults" className="label">Adults</label>
          <input id="bk-adults" name="adults" type="number" min="1" max="50" defaultValue={b.adults} className="field" />
        </div>
        <div>
          <label htmlFor="bk-children" className="label">Children</label>
          <input id="bk-children" name="children" type="number" min="0" max="50" defaultValue={b.children} className="field" />
        </div>
        <div>
          <label htmlFor="bk-month" className="label">Travel month</label>
          <input id="bk-month" name="travelMonth" type="month" defaultValue={b.travelMonth ?? ""} className="field" />
        </div>
        <div>
          <label htmlFor="bk-departure" className="label">Group date</label>
          <select id="bk-departure" value={departureId} onChange={(e) => setDepartureId(e.target.value)} className="field appearance-none">
            <option value="">No fixed group date</option>
            {b.departure && !departures?.some((d) => d.id === b.departure!.id) && <option value={b.departure.id}>{b.departure.title} · {formatDay(b.departure.startDate)}</option>}
            {departures?.map((d) => (
              <option key={d.id} value={d.id}>{d.title} · {formatDay(d.startDate)} · {Math.max(0, d.seats - d.booked)} left</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bk-tcs" className="label">TCS collected (₹) <span className="font-normal text-muted">charged on top of the total</span></label>
          <div className="flex gap-2">
            <input id="bk-tcs" type="number" min="0" step="1" inputMode="numeric" value={tcs} onChange={(e) => setTcs(e.target.value)} placeholder="0" className="field" />
            {b.suggestedTcs > 0 && rupees(b.suggestedTcs) !== tcs && (
              <button type="button" onClick={() => setTcs(rupees(b.suggestedTcs))} className="btn btn-outline shrink-0 !py-2 text-sm">
                Use {formatINR(b.suggestedTcs)}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">Overseas packages: the TCS rate is set in Settings (confirm with your CA). The customer can claim it against their income tax.</p>
        </div>
        <div className="flex items-end sm:col-span-2">
          <button type="submit" disabled={busy} className="btn btn-outline w-full disabled:opacity-50">Save</button>
        </div>
      </form>
    </Card>
  );
}

function RecordPayment({ busy, onSave }: { busy: boolean; onSave: (body: unknown) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline mt-4 !py-2">
        Record a payment received offline
      </button>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const ok = await onSave({
          amount: Number(f.get("amount")),
          method: f.get("method"),
          note: (f.get("note") as string) || undefined,
          sendReceipt: f.get("sendReceipt") === "on",
        });
        if (ok) setOpen(false);
      }}
      className="mt-4 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="pay-amount" className="label">Amount (₹)</label>
        <input id="pay-amount" name="amount" type="number" min="1" step="1" required className="field" />
      </div>
      <div>
        <label htmlFor="pay-method" className="label">Method</label>
        <select id="pay-method" name="method" defaultValue="bank_transfer" className="field appearance-none">
          {paymentMethods.filter((m) => m !== "online").map((m) => (
            <option key={m} value={m}>{paymentMethodLabels[m]}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="pay-note" className="label">Reference / note <span className="font-normal text-muted">(optional)</span></label>
        <input id="pay-note" name="note" placeholder="UTR number, cheque no., who received it…" className="field" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="sendReceipt" defaultChecked className="size-4 accent-[var(--color-brand)]" /> Email the customer a receipt
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">Save payment</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-outline !py-2">Cancel</button>
      </div>
    </form>
  );
}

function RecordRefund({ refundable, hasEmail, busy, onSave }: { refundable: number; hasEmail: boolean; busy: boolean; onSave: (body: unknown) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="mt-4 rounded-xl border border-line p-4">
        <p className="text-sm">This booking is cancelled. Record what you give back to the customer; whatever isn&apos;t refunded counts as cancellation charges.</p>
        <button type="button" onClick={() => setOpen(true)} className="btn btn-outline mt-3 !py-2">Record a refund</button>
      </div>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const ok = await onSave({
          amount: Number(f.get("amount")),
          method: f.get("method"),
          note: (f.get("note") as string) || undefined,
          notifyCustomer: f.get("notify") === "on",
        });
        if (ok) setOpen(false);
      }}
      className="mt-4 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="rf-amount" className="label">Refund amount (₹)</label>
        <input id="rf-amount" name="amount" type="number" min="1" max={refundable / 100} step="1" required defaultValue={refundable / 100} className="field" />
        <p className="mt-1 text-xs text-muted">Up to {formatINR(refundable)}. Lower it to keep cancellation charges.</p>
      </div>
      <div>
        <label htmlFor="rf-method" className="label">Refunded by</label>
        <select id="rf-method" name="method" defaultValue="bank_transfer" className="field appearance-none">
          {paymentMethods.map((m) => (
            <option key={m} value={m}>{paymentMethodLabels[m]}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rf-note" className="label">Reference / reason <span className="font-normal text-muted">(optional)</span></label>
        <input id="rf-note" name="note" placeholder="UTR number, cancellation charges deducted…" className="field" />
      </div>
      {hasEmail && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="notify" defaultChecked className="size-4 accent-[var(--color-brand)]" /> Email the customer a refund confirmation
        </label>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">Save refund</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-outline !py-2">Cancel</button>
      </div>
      <p className="text-xs text-muted sm:col-span-2">This records the refund. Send the money from your bank, UPI or payment gateway dashboard as usual.</p>
    </form>
  );
}

function StatusCard({ b, busy, onSave }: { b: AdminBookingDetail; busy: boolean; onSave: (status: BookingStatus, notify: boolean) => Promise<boolean> }) {
  const [status, setStatus] = useState<BookingStatus>(b.status);
  const [notify, setNotify] = useState(true);
  const emailsOn: BookingStatus[] = ["confirmed", "cancelled", "completed"];
  return (
    <Card title="Status">
      <label htmlFor="bk-status" className="sr-only">Booking status</label>
      <select id="bk-status" value={status} disabled={b.refundedAmount > 0} onChange={(e) => setStatus(e.target.value as BookingStatus)} className="field appearance-none disabled:opacity-60">
        {bookingStatuses.map((s) => (
          <option key={s} value={s}>{bookingStatusLabels[s]}</option>
        ))}
      </select>
      {emailsOn.includes(status) && status !== b.status && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-[var(--color-brand)]" /> Email the customer about this change
        </label>
      )}
      <button type="button" disabled={busy || status === b.status} onClick={() => void onSave(status, notify)} className="btn btn-outline mt-3 w-full disabled:opacity-50">
        Update status
      </button>
      <p className="mt-2 text-xs text-muted">
        {b.refundedAmount > 0
          ? "Money has been refunded on this booking, so it stays cancelled. Make a new booking if they travel after all."
          : status === "cancelled" && b.amountPaid > 0 && b.status !== "cancelled"
          ? `The customer has paid ${formatINR(b.amountPaid)}. After cancelling, record any refund under Payments.`
          : "Bookings confirm automatically when the deposit is paid."}
      </p>
    </Card>
  );
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
    >
      {copied ? <Check className="size-4 text-[#0f7a3a]" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Copied" : "Copy customer's booking link (to share on WhatsApp)"}
    </button>
  );
}
