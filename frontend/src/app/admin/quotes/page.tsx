"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import type { Paged } from "@dilruba/shared/crm";
import { quoteStatuses, quoteStatusLabels, type AdminQuote } from "@dilruba/shared/ops";
import { useAdminData } from "@/lib/admin-api";
import { Empty, ErrorBox, ListFilters, Loading, PageHeader, Pagination, QuoteBadge, formatDate } from "@/components/admin/ui";

export default function QuotesPage() {
  const params = useSearchParams();
  const { data, error, reload } = useAdminData<Paged<AdminQuote>>(`/quotes?${params.toString()}`);

  return (
    <>
      <PageHeader
        title="Quotes"
        subtitle="Written quotes customers can open and accept online. An accepted quote becomes a booking."
        actions={<Link href="/admin/quotes/new" className="btn btn-primary !py-2"><Plus className="size-4" aria-hidden /> New quote</Link>}
      />
      <ListFilters statuses={quoteStatuses.map((s) => ({ value: s, label: quoteStatusLabels[s] }))} />
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>No quotes yet. Start one from a lead with “New quote”.</Empty></div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Quote</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Trip</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((q) => (
                  <tr key={q.id} className="hover:bg-cream">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/admin/quotes/${q.id}`} className="font-medium hover:text-brand">{q.reference}</Link>
                      <p className="text-xs text-muted">{formatDate(q.createdAt)}{q.createdBy ? ` · ${q.createdBy}` : ""}</p>
                    </td>
                    <td className="px-4 py-3">{q.customer.name}<p className="text-xs text-muted">{q.customer.phone}</p></td>
                    <td className="px-4 py-3">{q.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatINR(q.total)}</td>
                    <td className="px-4 py-3"><QuoteBadge status={q.status} /></td>
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
