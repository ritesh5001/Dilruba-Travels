"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BellRing, Plus } from "lucide-react";
import { formatTravelMonth, leadStatuses, leadStatusLabels } from "@dilruba/shared/booking";
import type { AdminLead, Paged } from "@dilruba/shared/crm";
import { useAdminData } from "@/lib/admin-api";
import { Empty, ErrorBox, LeadBadge, ListFilters, Loading, PageHeader, Pagination, formatDate } from "@/components/admin/ui";
import { useCan } from "@/components/admin/shell";

export default function LeadsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data, error, reload } = useAdminData<Paged<AdminLead>>(`/leads?${params.toString()}`);
  const mine = params.get("assigned") === "me";
  const can = useCan();
  const toggleMine = () => {
    const sp = new URLSearchParams(params.toString());
    if (mine) sp.delete("assigned");
    else sp.set("assigned", "me");
    sp.delete("page");
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`);
  };

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Enquiries from the website, phone and walk-ins. Contact them, send a quote, then convert to a booking."
        actions={
          <>
            {/* Sales only ever see their own leads, so the toggle is for everyone else. */}
            {can("leads.all") && (
              <button type="button" onClick={toggleMine} aria-pressed={mine} className={`btn !py-2 ${mine ? "bg-ink text-white" : "btn-outline"}`}>
                My leads
              </button>
            )}
            {can("leads.write") && <Link href="/admin/leads/new" className="btn btn-primary !py-2"><Plus className="size-4" aria-hidden /> Add lead</Link>}
          </>
        }
      />
      <ListFilters statuses={[{ value: "followup", label: "Follow-ups due" }, ...leadStatuses.map((s) => ({ value: s, label: leadStatusLabels[s] }))]} />
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>No leads match.</Empty></div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Interested in</th>
                  <th className="px-4 py-3 font-medium">Travel</th>
                  <th className="px-4 py-3 font-medium">Next step</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((l) => (
                  <tr key={l.id} className="hover:bg-cream">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${l.id}`} className="font-medium hover:text-brand">{l.customer.name}</Link>
                      <p className="text-xs text-muted">{l.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3">{l.packageName ?? `${l.service}${l.option ? ` – ${l.option}` : ""}`}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatTravelMonth(l.travelMonth)}{l.travellers ? ` · ${l.travellers} pax` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {l.followUpAt ? (
                        <span className={l.followUpAt < new Date().toISOString() ? "font-medium text-brand" : ""}>
                          <BellRing className="mr-1 inline size-3.5" aria-hidden />{formatDate(l.followUpAt, true)}
                        </span>
                      ) : l.status === "lost" && l.lostReason ? (
                        l.lostReason
                      ) : (
                        "—"
                      )}
                      {l.assignedTo && <p className="text-xs">{l.assignedTo.name}</p>}
                    </td>
                    <td className="px-4 py-3"><LeadBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
        </>
      )}
    </>
  );
}
