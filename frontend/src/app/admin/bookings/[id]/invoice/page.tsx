"use client";

import { useParams } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import { formatDay, type InvoiceData } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { ErrorBox, Loading, PageHeader, formatDate } from "@/components/admin/ui";

/** Printable tax invoice (or receipt, without a GSTIN). Print or "Save as PDF" from the browser. */
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { data: inv, setData, error, reload } = useAdminData<InvoiceData>(`/bookings/${id}/invoice`);
  const action = useAction();

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!inv) return <Loading />;

  const isTaxInvoice = inv.gst !== null;
  const title = inv.number ? (isTaxInvoice ? "Tax Invoice" : "Invoice") : "Pro-forma (not yet issued)";

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          back={{ href: `/admin/bookings/${id}`, label: inv.booking.reference }}
          title={inv.number ? `Invoice ${inv.number}` : "Invoice"}
          subtitle={inv.number ? "Print it or save it as a PDF to send to the customer." : "Issue the invoice to give it a permanent number. Numbers run in order each financial year."}
          actions={
            <>
              {!inv.number && (
                <button
                  type="button"
                  disabled={action.busy}
                  onClick={async () => {
                    const issued = await action.run(() => adminFetch<InvoiceData>(`/bookings/${id}/invoice`, { method: "POST" }));
                    if (issued) setData(issued);
                  }}
                  className="btn btn-primary !py-2 disabled:opacity-60"
                >
                  {action.busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Issue invoice number
                </button>
              )}
              <button type="button" onClick={() => window.print()} className="btn btn-outline !py-2"><Printer className="size-4" aria-hidden /> Print / Save PDF</button>
            </>
          }
        />
        {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
        {!isTaxInvoice && <p className="mb-4 rounded-xl bg-amber/20 px-4 py-3 text-sm">No GSTIN in Settings, so this prints as a plain invoice without a GST breakdown.</p>}
      </div>

      <article className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-8 text-sm print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="font-display text-xl font-semibold">{inv.seller.legalName}</p>
            <p className="mt-1 max-w-xs whitespace-pre-line text-muted">{inv.seller.address}</p>
            <p className="mt-1 text-muted">{inv.seller.phone} · {inv.seller.email}</p>
            {inv.seller.gstin && <p className="mt-1 font-medium">GSTIN: {inv.seller.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold uppercase tracking-wide text-brand">{title}</p>
            {inv.number && <p className="mt-1">No. <strong>{inv.number}</strong></p>}
            <p className="text-muted">Date: {inv.date ? formatDay(inv.date) : formatDate(new Date().toISOString())}</p>
            <p className="text-muted">Booking: {inv.booking.reference}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Billed to</p>
            <p className="mt-1 font-semibold">{inv.buyer.name}</p>
            <p className="text-muted">{inv.buyer.phone}{inv.buyer.email ? ` · ${inv.buyer.email}` : ""}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Trip</p>
            <p className="mt-1 font-semibold">{inv.booking.packageTitle}</p>
            <p className="text-muted">{inv.booking.departure ?? inv.booking.travelMonth} · {inv.booking.adults} adult{inv.booking.adults === 1 ? "" : "s"}{inv.booking.children ? `, ${inv.booking.children} child${inv.booking.children === 1 ? "" : "ren"}` : ""}</p>
            {inv.travellers.length > 0 && <p className="mt-1 text-muted">Travellers: {inv.travellers.join(", ")}</p>}
          </div>
        </section>

        <table className="mt-6 w-full">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="py-2 font-medium">Description</th><th className="py-2 text-right font-medium">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {inv.gst ? (
              <>
                <tr><td className="py-2.5">Tour package: {inv.booking.packageTitle} (SAC 998555)<br /><span className="text-xs text-muted">Taxable value</span></td><td className="py-2.5 text-right">{formatINR(inv.gst.taxable)}</td></tr>
                <tr><td className="py-2.5">GST @ {inv.gst.rate}%{inv.gst.rate > 0 ? ` (CGST ${inv.gst.rate / 2}% + SGST ${inv.gst.rate / 2}%)` : ""}</td><td className="py-2.5 text-right">{formatINR(inv.gst.tax)}</td></tr>
                <tr className="font-medium"><td className="py-2.5">Package price (incl. GST)</td><td className="py-2.5 text-right">{formatINR(inv.packagePrice)}</td></tr>
              </>
            ) : (
              <tr><td className="py-2.5">Tour package: {inv.booking.packageTitle}</td><td className="py-2.5 text-right">{formatINR(inv.packagePrice)}</td></tr>
            )}
            {inv.tcs && (
              <tr><td className="py-2.5">TCS @ {inv.tcs.rate}% under section 206C(1G)<br /><span className="text-xs text-muted">Collected on the overseas tour package; claimable against the traveller&apos;s income tax</span></td><td className="py-2.5 text-right">{formatINR(inv.tcs.amount)}</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink text-base font-semibold"><td className="py-3">Total</td><td className="py-3 text-right">{formatINR(inv.total)}</td></tr>
            <tr><td className="py-1 text-muted">Paid</td><td className="py-1 text-right text-muted">{formatINR(inv.paid)}</td></tr>
            <tr className="font-semibold"><td className="py-1">Balance due</td><td className="py-1 text-right">{formatINR(inv.balance)}</td></tr>
          </tfoot>
        </table>

        {inv.payments.length > 0 && (
          <section className="mt-8">
            <p className="text-xs uppercase tracking-wide text-muted">Payments received</p>
            <table className="mt-2 w-full">
              <tbody className="divide-y divide-line">
                {inv.payments.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2">{formatDate(p.date)}</td>
                    <td className="py-2">{p.method}{p.reference ? ` · ${p.reference}` : ""}</td>
                    <td className="py-2 text-right">{formatINR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {inv.seller.bankDetails && (
          <section className="mt-8 rounded-xl bg-sand p-4 print:border print:border-line print:bg-transparent">
            <p className="text-xs uppercase tracking-wide text-muted">Bank details for payment</p>
            <p className="mt-1 whitespace-pre-line">{inv.seller.bankDetails}</p>
          </section>
        )}
        <p className="mt-8 text-xs text-muted">This is a computer-generated invoice. Prices include all taxes except TCS where shown.</p>
      </article>
    </>
  );
}
