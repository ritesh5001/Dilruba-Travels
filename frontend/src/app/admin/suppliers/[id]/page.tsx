"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Ban, Loader2, Mail, Pencil, Phone } from "lucide-react";
import { formatINR, paymentMethodLabels, paymentMethods } from "@dilruba/shared/booking";
import { costCategoryLabels, formatDay, supplierTypeLabels, todayIST, type AdminSupplierDetail } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { WhatsAppIcon } from "@/components/icons";
import { SupplierForm } from "@/components/admin/supplier-form";
import { Badge, Card, Empty, ErrorBox, Field, Loading, PageHeader, customerWhatsapp, formatDate } from "@/components/admin/ui";

const stateBadge = { paid: <Badge color="green">Paid</Badge>, part_paid: <Badge color="blue">Part paid</Badge>, unpaid: <Badge color="amber">Unpaid</Badge> } as const;

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const prefill = useSearchParams().get("pay");
  const { data: s, setData, error, reload } = useAdminData<AdminSupplierDetail>(`/suppliers/${id}`);
  const action = useAction();
  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [today] = useState(() => todayIST());

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!s) return <Loading />;

  async function run(path: string, method: string, body: unknown, message: string) {
    setFlash(null);
    const updated = await action.run(() => adminFetch<AdminSupplierDetail>(`/suppliers/${id}${path}`, { method, body }));
    if (updated) {
      setData(updated);
      setFlash(message);
    }
    return !!updated;
  }

  return (
    <>
      <PageHeader
        back={{ href: "/admin/suppliers", label: "Suppliers" }}
        title={s.name}
        subtitle={<>{supplierTypeLabels[s.type]}{!s.active && " · inactive"} · {s.owed > 0 ? <strong className="text-brand">{formatINR(s.owed)} owed</strong> : "nothing owed"}</>}
        actions={
          <>
            {s.phone && (
              <>
                <a href={customerWhatsapp(s.phone, `Assalamu Alaikum, this is Dilruba Travels.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp !py-2"><WhatsAppIcon className="size-4" /> WhatsApp</a>
                <a href={`tel:${s.phone}`} className="btn btn-outline !py-2"><Phone className="size-4" aria-hidden /> Call</a>
              </>
            )}
            {s.email && <a href={`mailto:${s.email}`} className="btn btn-outline !py-2"><Mail className="size-4" aria-hidden /> Email</a>}
            {!editing && <button type="button" onClick={() => setEditing(true)} className="btn btn-outline !py-2"><Pencil className="size-4" aria-hidden /> Edit</button>}
          </>
        }
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
      {flash && <p role="status" className="mb-4 rounded-xl bg-[#25d366]/10 px-4 py-3 text-sm font-medium text-[#0f7a3a]">{flash}</p>}

      {editing && (
        <Card title="Edit supplier" className="mb-6 max-w-3xl">
          <SupplierForm initial={s} busy={action.busy} onCancel={() => setEditing(false)} onSave={async (body) => { if (await run("", "PUT", body, "Supplier saved.")) setEditing(false); }} />
        </Card>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total costs", value: formatINR(s.totalCosts), hint: `${s.costCount} cost${s.costCount === 1 ? "" : "s"} on bookings` },
          { label: "Paid", value: formatINR(s.totalPaid) },
          { label: "Still owed", value: formatINR(s.owed), alert: s.owed > 0 },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-white p-5">
            <p className="text-sm text-muted">{t.label}</p>
            <p className={`mt-1 font-display text-3xl font-semibold ${t.alert ? "text-brand" : ""}`}>{t.value}</p>
            {t.hint && <p className="mt-1 text-xs text-muted">{t.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card title="Costs on bookings">
            {s.costs.length === 0 ? (
              <Empty>No costs yet. Add a cost on a booking and choose this supplier.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr><th className="py-2 pr-3 font-medium">Booking</th><th className="py-2 pr-3 font-medium">For</th><th className="py-2 pr-3 text-right font-medium">Amount</th><th className="py-2 font-medium">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.costs.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 pr-3">
                          <Link href={`/admin/bookings/${c.bookingId}`} className="font-medium hover:text-brand">{c.reference}</Link>
                          <p className="text-xs text-muted">{c.customerName}</p>
                        </td>
                        <td className="py-2.5 pr-3">{costCategoryLabels[c.category]}<p className="text-xs text-muted">{c.note ?? c.packageTitle}</p></td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-right font-semibold">{formatINR(c.amount)}{c.state === "part_paid" && <p className="text-xs font-normal text-muted">{formatINR(c.covered)} paid</p>}</td>
                        <td className="py-2.5">{stateBadge[c.state]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Payments to this supplier">
            {s.payments.length === 0 ? (
              <Empty>No payments recorded yet.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {s.payments.map((p) => (
                  <li key={p.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 text-sm ${p.voidedAt ? "text-muted" : ""}`}>
                    <div className="min-w-0">
                      <p className={`font-medium ${p.voidedAt ? "line-through" : ""}`}>{formatINR(p.amount)} · {formatDay(p.paidOn)}</p>
                      <p className="text-xs text-muted">
                        {[p.method && (paymentMethodLabels[p.method as keyof typeof paymentMethodLabels] ?? p.method), p.reference, p.note, p.createdBy && `by ${p.createdBy}`].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {p.voidedAt && <p className="text-xs text-brand">Voided {formatDate(p.voidedAt)}: {p.voidReason}</p>}
                    </div>
                    {!p.voidedAt && (
                      <button
                        type="button"
                        disabled={action.busy}
                        onClick={() => {
                          const reason = window.prompt("Why is this payment being voided? (e.g. entered twice)");
                          if (reason?.trim()) void run(`/payments/${p.id}/void`, "POST", { reason: reason.trim() }, "Payment voided.");
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand"
                      >
                        <Ban className="size-3.5" aria-hidden /> Void
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Record a payment">
            <form
              key={s.payments.length}
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await run(
                  "/payments",
                  "POST",
                  { amount: Number(f.get("amount")), paidOn: f.get("paidOn"), method: f.get("method"), reference: f.get("reference"), note: f.get("note") },
                  "Payment recorded.",
                );
              }}
              className="grid gap-3"
            >
              <div>
                <label htmlFor="sp-amount" className="label">Amount (₹)</label>
                <input id="sp-amount" name="amount" type="number" min="1" step="1" required defaultValue={prefill ?? (s.owed ? s.owed / 100 : "")} className="field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sp-date" className="label">Paid on</label>
                  <input id="sp-date" name="paidOn" type="date" max={today} defaultValue={today} required className="field" />
                </div>
                <div>
                  <label htmlFor="sp-method" className="label">How</label>
                  <select id="sp-method" name="method" defaultValue="bank_transfer" className="field appearance-none">
                    {paymentMethods.filter((m) => m !== "online").map((m) => <option key={m} value={m}>{paymentMethodLabels[m]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="sp-ref" className="label">Reference <span className="font-normal text-muted">(UTR, cheque no.)</span></label>
                <input id="sp-ref" name="reference" className="field" />
              </div>
              <div>
                <label htmlFor="sp-note" className="label">Note <span className="font-normal text-muted">(optional)</span></label>
                <input id="sp-note" name="note" placeholder="e.g. Ramadan group A hotel advance" className="field" />
              </div>
              <button type="submit" disabled={action.busy} className="btn btn-primary disabled:opacity-50">
                {action.busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save payment
              </button>
              <p className="text-xs text-muted">Payments clear this supplier&apos;s oldest unpaid costs first.</p>
            </form>
          </Card>
          <Card title="Details">
            <div className="grid gap-3">
              <Field label="Contact person">{s.contactPerson ?? "—"}</Field>
              <Field label="Phone">{s.phone ?? "—"}</Field>
              <Field label="Email">{s.email ?? "—"}</Field>
              <Field label="Notes"><span className="whitespace-pre-wrap">{s.notes ?? "—"}</span></Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
