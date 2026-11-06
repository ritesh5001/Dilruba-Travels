"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { formatDay, roomTypeLabels, rupeesInWords, todayIST, type InvoiceData } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { ErrorBox, Loading, PageHeader, formatDate } from "@/components/admin/ui";
import { useCan } from "@/components/admin/shell";

/** 1234567 paise → "12,345.67", the way the amounts print on the invoice. */
const amount = (paise: number) => (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "Label: value" lines → [label, value] (a line without a colon has no label). */
const labelled = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 && i < 30 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ["", l];
    });

// Bordered cells, as on the printed voucher.
const cell = "border border-black/70 px-2 py-1.5 align-top";
const head = `${cell} bg-black/[0.04] text-center font-semibold`;

/**
 * The booking invoice in the style of the company's printed vouchers: a boxed A4 sheet with the
 * letterhead, billing details, passenger and charges tables, GST totals with the amount in words,
 * bank details and terms. Print it or "Save as PDF" from the browser. Before a number is issued
 * it's a pro-forma invoice.
 */
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { data: inv, setData, error, reload } = useAdminData<InvoiceData>(`/bookings/${id}/invoice`);
  const action = useAction();
  const canEditSac = useCan()("payments.write");

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!inv) return <Loading />;

  // A tax invoice needs GST ticked on the booking and the company's GSTIN in Settings.
  const isTaxInvoice = inv.gst !== null && !!inv.seller.gstin;
  const title = inv.number ? (isTaxInvoice ? "TAX INVOICE" : "INVOICE") : "PROFORMA INVOICE";
  // GST splits evenly into CGST and SGST (any odd paisa goes to SGST).
  const cgst = inv.gst ? Math.floor(inv.gst.tax / 2) : 0;
  const totals: [string, number, boolean?][] = inv.gst
    ? [
        ["Sub Total (taxable value)", inv.gst.taxable],
        [`CGST @ ${inv.gst.rate / 2}%`, cgst],
        [`SGST @ ${inv.gst.rate / 2}%`, inv.gst.tax - cgst],
        ["IGST @ 0%", 0],
      ]
    : [["Sub Total", inv.packagePrice]];
  if (inv.tcs) totals.push([`TCS @ ${inv.tcs.rate}% (sec. 206C(1G))`, inv.tcs.amount]);
  totals.push(["Total", inv.total, true]);
  const bank = labelled(inv.seller.bankDetails);
  const terms = labelled(inv.seller.terms);
  const fillerRows = Math.max(0, 4 - inv.items.length);

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          back={{ href: `/admin/bookings/${id}`, label: inv.booking.reference }}
          title={inv.number ? `Invoice ${inv.number}` : "Invoice"}
          subtitle={inv.number ? "Print it or save it as a PDF to send to the customer." : "This is a pro-forma until you issue it. Issuing gives it a permanent number; numbers run in order each financial year."}
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
        {canEditSac && <SacCode key={inv.sacCode} inv={inv} busy={action.busy} onSave={(sacCode) => action.run(async () => {
          await adminFetch(`/bookings/${id}`, { method: "PATCH", body: { sacCode, notifyCustomer: false } });
          await reload();
        })} />}
        {inv.gst && !inv.seller.gstin && <p className="mb-4 rounded-xl bg-amber/20 px-4 py-3 text-sm">GST is ticked on this booking but there&apos;s no GSTIN in Settings. Add it there so this prints as a tax invoice.</p>}
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <article className="mx-auto w-[210mm] min-w-[760px] bg-white text-[11.5px] leading-snug text-black print:w-auto print:min-w-0 [print-color-adjust:exact]">
          <div className="border border-black/70">
            <h1 className="border-b border-black/70 py-2.5 text-center text-lg font-bold tracking-wide">{title}</h1>

            {/* Letterhead */}
            <div className="flex items-center justify-between gap-6 border-b border-black/70 px-3 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- printed as-is */}
              <img src="/brand/logo-badge.webp" alt="" className="size-20 shrink-0 object-contain" />
              <div className="text-right">
                <p className="text-[13px] font-bold uppercase">{inv.seller.legalName}</p>
                <p className="ml-auto max-w-md whitespace-pre-line">{inv.seller.address}</p>
                <p>Tel : {inv.seller.phone}</p>
                <p>Email : {inv.seller.email}</p>
                {inv.seller.gstin && <p className="font-semibold">GSTIN : {inv.seller.gstin}</p>}
              </div>
            </div>

            {/* Billed to | invoice details */}
            <div className="grid grid-cols-2 border-b border-black/70">
              <div className="border-r border-black/70 px-3 py-2">
                <p>To,</p>
                <p className="font-semibold uppercase">{inv.buyer.name}</p>
                <p>Mobile : {inv.buyer.phone}</p>
                {inv.buyer.email && <p>{inv.buyer.email}</p>}
              </div>
              <div className="px-3 py-2 text-right">
                <p>Booking Reference : <strong>{inv.booking.reference}</strong></p>
                <p>Inv Date : {formatDay(inv.date ?? todayIST())}</p>
                <p>{inv.number ? "Invoice No" : "Proforma Inv No"} : <strong>{inv.number ?? `PRO-${inv.booking.reference}`}</strong></p>
                <p>SAC Code : {inv.sacCode}</p>
              </div>
            </div>

            {/* Trip */}
            <div className="grid grid-cols-[auto_1fr] gap-x-3 border-b border-black/70 px-3 py-2">
              <span className="font-semibold">Package</span>
              <span>: {inv.booking.packageTitle}{inv.booking.roomType ? ` – ${roomTypeLabels[inv.booking.roomType]}` : ""}</span>
              <span className="font-semibold">Travel</span>
              <span>: {inv.booking.departure ?? inv.booking.travelMonth} · {inv.booking.adults} adult{inv.booking.adults === 1 ? "" : "s"}{inv.booking.children ? `, ${inv.booking.children} child${inv.booking.children === 1 ? "" : "ren"}` : ""}</span>
            </div>

            {/* Passengers */}
            {inv.travellers.length > 0 && (
              <table className="-mt-px w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`${head} w-10`}>Sr. No.</th>
                    <th className={`${head} w-16`}>Pax Type</th>
                    <th className={head}>Pax Name</th>
                    <th className={`${head} w-28`}>Passport</th>
                    <th className={`${head} w-28`}>Nationality</th>
                    <th className={`${head} w-32`}>Room</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.travellers.map((t, i) => (
                    <tr key={i}>
                      <td className={cell}>{i + 1}</td>
                      <td className={cell}>{t.type}</td>
                      <td className={`${cell} uppercase`}>{t.name}</td>
                      <td className={cell}>{t.passport ?? "—"}</td>
                      <td className={cell}>{t.nationality}</td>
                      <td className={cell}>{t.room ? roomTypeLabels[t.room] : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Charges */}
            <table className="-mt-px w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${head} w-10`}>Sr. No.</th>
                  <th className={head}>Service Description</th>
                  <th className={`${head} w-20`}>SAC</th>
                  <th className={`${head} w-14`}>Qty</th>
                  <th className={`${head} w-28`}>Rate (₹)</th>
                  <th className={`${head} w-28`}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((item, i) => (
                  <tr key={i}>
                    <td className={cell}>{i + 1}</td>
                    <td className={cell}>{item.description}</td>
                    <td className={`${cell} text-center`}>{inv.sacCode}</td>
                    <td className={`${cell} text-center`}>{item.quantity}</td>
                    <td className={`${cell} text-right`}>{amount(item.rate)}</td>
                    <td className={`${cell} text-right`}>{amount(item.amount)}</td>
                  </tr>
                ))}
                {Array.from({ length: fillerRows }, (_, i) => (
                  <tr key={`empty-${i}`} aria-hidden>
                    {Array.from({ length: 6 }, (_, j) => <td key={j} className={`${cell} h-6`} />)}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Amount in words | totals */}
            <div className="-mt-px grid grid-cols-[1fr_320px] border-b border-black/70">
              <div className="border-r border-black/70 px-3 py-2">
                <p><span className="font-semibold">Amount in Words:</span> {rupeesInWords(inv.total)}</p>
                {inv.gst && <p className="mt-1 text-[10.5px] text-black/70">Prices include GST. SAC {inv.sacCode}.</p>}
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  {totals.map(([label, value, strong]) => (
                    <tr key={label} className={strong ? "font-bold" : ""}>
                      <td className="border-b border-black/70 px-2 py-1">{label}</td>
                      <td className="w-28 border-b border-l border-black/70 px-2 py-1 text-right">{amount(value)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border-b border-black/70 px-2 py-1">Paid</td>
                    <td className="border-b border-l border-black/70 px-2 py-1 text-right">{amount(inv.paid)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="px-2 py-1">Balance Due</td>
                    <td className="border-l border-black/70 px-2 py-1 text-right">{amount(inv.balance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payments received */}
            {inv.payments.length > 0 && (
              <div className="border-b border-black/70 px-3 py-2">
                <p className="font-semibold underline">Payments Received:</p>
                <table className="mt-1 w-full">
                  <tbody>
                    {inv.payments.map((p, i) => (
                      <tr key={i}>
                        <td className="w-32 py-0.5">{formatDate(p.date)}</td>
                        <td className="py-0.5">{p.method}{p.reference ? ` · ${p.reference}` : ""}</td>
                        <td className="w-28 py-0.5 text-right">{amount(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bank details */}
            {bank.length > 0 && (
              <div className="border-b border-black/70 px-3 py-2">
                <p className="font-semibold underline">Bank Details:</p>
                <div className="mt-1 grid grid-cols-2 gap-x-8 gap-y-1">
                  {bank.map(([label, value], i) => (
                    <p key={i} className="grid grid-cols-[130px_1fr] gap-2">
                      <span>{label}</span>
                      <span>{label ? ": " : ""}{value}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Terms */}
            {terms.length > 0 && (
              <div className="border-b border-black/70 px-3 py-2 text-[10.5px]">
                <p className="font-semibold underline">Terms &amp; Conditions :</p>
                <div className="mt-1 grid grid-cols-[100px_1fr] gap-x-2">
                  {terms.map(([label, value], i) => (
                    <p key={i} className="contents">
                      <span>{label}</span>
                      <span>{label ? ": " : ""}{value}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            <p className="px-3 py-1.5 text-right">This is a system generated invoice; no stamp or signature required.</p>
          </div>
        </article>
      </div>
    </>
  );
}

/** The SAC code for this booking's invoice: the Settings default, or its own (e.g. visa services). */
function SacCode({ inv, busy, onSave }: { inv: InvoiceData; busy: boolean; onSave: (sacCode: string | null) => Promise<unknown> }) {
  const [value, setValue] = useState(inv.sacCode);
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="inv-sac" className="label">SAC code on this invoice</label>
        <input id="inv-sac" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={8} className="field w-40" />
      </div>
      <button type="button" disabled={busy || value === inv.sacCode || !/^\d{4,8}$/.test(value)} onClick={() => void onSave(value)} className="btn btn-outline !py-2 disabled:opacity-50">Save SAC</button>
      {inv.sacOverridden && (
        <button type="button" disabled={busy} onClick={() => void onSave(null)} className="py-2 text-sm text-muted hover:text-brand">Use the default from Settings</button>
      )}
      <p className="w-full text-xs text-muted">998555 tour operator services · 998559 other travel arrangement (e.g. visa) · 998551 air ticket reservation. The default is set in Settings.</p>
    </div>
  );
}
