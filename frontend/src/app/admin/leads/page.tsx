"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatTravelMonth, leadStatuses, leadStatusLabels } from "@dilruba/shared/booking";
import type { AdminLead, Paged } from "@dilruba/shared/crm";
import { useAdminData } from "@/lib/admin-api";
import { Empty, ErrorBox, LeadBadge, ListFilters, Loading, PageHeader, Pagination, formatDate } from "@/components/admin/ui";

export default function LeadsPage() {
  const params = useSearchParams();
  const { data, error, reload } = useAdminData<Paged<AdminLead>>(`/leads?${params.toString()}`);

  return (
    <>
      <PageHeader title="Leads" subtitle="Enquiries from the website forms. Contact them, then convert to a booking." />
      <ListFilters statuses={leadStatuses.map((s) => ({ value: s, label: leadStatusLabels[s] }))} />
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>No leads match.</Empty></div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Interested in</th>
                  <th className="px-4 py-3 font-medium">Travel</th>
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
