"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatINR } from "@dilruba/shared/booking";
import type { AdminCustomer, Paged } from "@dilruba/shared/crm";
import { useAdminData } from "@/lib/admin-api";
import { Empty, ErrorBox, ListFilters, Loading, PageHeader, Pagination, formatDate } from "@/components/admin/ui";

export default function CustomersPage() {
  const params = useSearchParams();
  const { data, error, reload } = useAdminData<Paged<AdminCustomer>>(`/customers?${params.toString()}`);

  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone who has enquired or booked, matched by phone number." />
      <ListFilters statuses={[]} />
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>No customers match.</Empty></div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 text-right font-medium">Enquiries</th>
                  <th className="px-4 py-3 text-right font-medium">Bookings</th>
                  <th className="px-4 py-3 text-right font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-cream">
                    <td className="px-4 py-3"><Link href={`/admin/customers/${c.id}`} className="font-medium hover:text-brand">{c.name}</Link></td>
                    <td className="px-4 py-3">
                      <p>{c.phone}</p>
                      <p className="text-xs text-muted">{c.email ?? "No email"}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{c.leadCount}</td>
                    <td className="px-4 py-3 text-right">{c.bookingCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatINR(c.totalPaid)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(c.createdAt)}</td>
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
