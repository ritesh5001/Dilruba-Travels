"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { formatINR, leadStatuses, leadStatusLabels } from "@dilruba/shared/booking";
import { todayIST, type Reports } from "@dilruba/shared/ops";
import { useAdminData } from "@/lib/admin-api";
import { Card, Empty, ErrorBox, Loading, PageHeader, exportUrl } from "@/components/admin/ui";

const daysAgo = (n: number) => todayIST(new Date(Date.now() - n * 864e5));
const ranges = [
  { label: "Last 30 days", from: () => daysAgo(29) },
  { label: "Last 90 days", from: () => daysAgo(89) },
  { label: "This year", from: () => `${todayIST().slice(0, 4)}-01-01` },
  { label: "Last 12 months", from: () => daysAgo(364) },
];

/** ₹2.4L, ₹85k: short enough for a chart label. */
function compactINR(paise: number) {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${Math.round(r / 1e3)}k`;
  return `₹${Math.round(r)}`;
}

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

/** A labelled horizontal bar; widths are relative to the largest value in its list. */
function Bar({ label, value, max, display, hint }: { label: string; value: number; max: number; display: string; hint?: string }) {
  return (
    <li>
      <div className="flex justify-between gap-3 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-semibold">{display}{hint && <span className="ml-1 font-normal text-muted">{hint}</span>}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
        <div className="h-full rounded-full bg-brand" style={{ width: `${max && value ? Math.max(2, (value / max) * 100) : 0}%` }} />
      </div>
    </li>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState(1);
  const from = ranges[range]!.from();
  const { data: r, error, reload } = useAdminData<Reports>(`/reports?from=${from}&to=${todayIST()}`);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Where your enquiries come from, what converts, and what you earn."
        actions={
          <div className="flex flex-wrap gap-2">
            {(["leads", "bookings", "payments"] as const).map((k) => (
              <a key={k} href={exportUrl(`${k}.csv`)} className="btn btn-outline !py-2 text-sm capitalize"><Download className="size-4" aria-hidden /> {k}</a>
            ))}
          </div>
        }
      />
      <div className="no-scrollbar -mx-1 mb-6 flex gap-1 overflow-x-auto px-1">
        {ranges.map((x, i) => (
          <button key={x.label} type="button" onClick={() => setRange(i)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${range === i ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-line hover:text-ink"}`}>
            {x.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !r ? (
        <Loading />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
          <div className="grid gap-3 sm:grid-cols-4 xl:col-span-2">
            {[
              { label: "Leads", value: String(r.funnel.leads), hint: `${pct(r.funnel.byStatus.converted, r.funnel.leads)} converted` },
              { label: "Quotes accepted", value: `${r.quotes.accepted} / ${r.quotes.sent}`, hint: `${formatINR(r.quotes.acceptedValue)} won` },
              { label: "Average rating", value: r.feedback.average ? `${r.feedback.average.toFixed(1)} ★` : "—", hint: `${r.feedback.count} review${r.feedback.count === 1 ? "" : "s"}` },
              { label: "Repeat customers", value: String(r.repeatCustomers), hint: `${r.referredLeads} referred leads in range` },
            ].map((t) => (
              <div key={t.label} className="rounded-2xl border border-line bg-white p-5">
                <p className="text-sm text-muted">{t.label}</p>
                <p className="mt-1 font-display text-3xl font-semibold">{t.value}</p>
                <p className="mt-1 text-xs text-muted">{t.hint}</p>
              </div>
            ))}
          </div>

          <Card title="Leads by status">
            {r.funnel.leads === 0 ? (
              <Empty>No leads in this period.</Empty>
            ) : (
              <ul className="space-y-3">
                {leadStatuses.map((s) => (
                  <Bar key={s} label={leadStatusLabels[s]} value={r.funnel.byStatus[s]} max={r.funnel.leads} display={String(r.funnel.byStatus[s])} hint={pct(r.funnel.byStatus[s], r.funnel.leads)} />
                ))}
              </ul>
            )}
          </Card>

          <Card title="Where leads come from">
            {r.bySource.length === 0 ? (
              <Empty>No leads in this period.</Empty>
            ) : (
              <ul className="space-y-3">
                {r.bySource.map((s) => (
                  <Bar key={s.source} label={s.source} value={s.leads} max={r.bySource[0]!.leads} display={String(s.leads)} hint={`${pct(s.converted, s.leads)} booked`} />
                ))}
              </ul>
            )}
          </Card>

          <Card title="Money received (last 12 months)" className="xl:col-span-2">
            {(() => {
              const max = Math.max(...r.revenueByMonth.map((m) => m.received), 1);
              return (
                <div className="flex h-56 items-end gap-1.5 sm:gap-3" role="list">
                  {r.revenueByMonth.map((m) => {
                    const [y, mo] = m.month.split("-").map(Number);
                    const label = new Date(Date.UTC(y!, mo! - 1, 1)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
                    return (
                      <div key={m.month} role="listitem" className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${label} ${y}: ${formatINR(m.received)} · ${m.bookings} bookings`}>
                        <span className="hidden text-[10px] text-muted sm:block">{m.received ? compactINR(m.received) : ""}</span>
                        <div className="w-full rounded-t-md bg-brand/80" style={{ height: `${(m.received / max) * 100}%`, minHeight: m.received ? 4 : 0 }} />
                        <span className="text-[11px] text-muted">{label}</span>
                        <span className="sr-only">{formatINR(m.received)}, {m.bookings} bookings</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>

          <Card title="Bookings & profit by category">
            {r.byCategory.length === 0 ? (
              <Empty>No bookings in this period.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted">
                    <tr><th className="py-2 font-medium">Category</th><th className="py-2 text-right font-medium">Bookings</th><th className="py-2 text-right font-medium">Sales</th><th className="py-2 text-right font-medium">Profit</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {r.byCategory.map((c) => (
                      <tr key={c.category}>
                        <td className="py-2.5">{c.category}</td>
                        <td className="py-2.5 text-right">{c.bookings}</td>
                        <td className="py-2.5 text-right">{formatINR(c.sales)}</td>
                        <td className="py-2.5 text-right font-semibold">{c.costs ? formatINR(c.sales - c.costs) : <span className="font-normal text-muted">add costs</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-muted">Profit uses the supplier costs entered on each booking.</p>
          </Card>

          <Card title="Why leads were lost">
            {r.lostReasons.length === 0 ? (
              <Empty>No lost leads in this period.</Empty>
            ) : (
              <ul className="space-y-3">
                {r.lostReasons.map((l) => (
                  <Bar key={l.reason} label={l.reason} value={l.count} max={r.lostReasons[0]!.count} display={String(l.count)} />
                ))}
              </ul>
            )}
          </Card>

          <Card title="Team performance">
            {r.byStaff.length === 0 ? (
              <Empty>No leads in this period.</Empty>
            ) : (
              <ul className="space-y-3">
                {r.byStaff.map((s) => (
                  <Bar key={s.name} label={s.name} value={s.leads} max={r.byStaff[0]!.leads} display={`${s.converted}/${s.leads}`} hint={`${pct(s.converted, s.leads)} booked`} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
