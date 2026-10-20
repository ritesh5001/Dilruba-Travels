"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { bookingStatuses, bookingStatusLabels, formatINR, formatTravelMonth } from "@dilruba/shared/booking";
import type { AdminBooking, Paged } from "@dilruba/shared/crm";
import { useAdminData } from "@/lib/admin-api";
import { BookingBadge, Empty, ErrorBox, ListFilters, Loading, PageHeader, Pagination, formatDate } from "@/components/admin/ui";

export default function BookingsPage() {
  const params = useSearchParams();
  const { data, error, reload } = useAdminData<Paged<AdminBooking>>(`/bookings?${params.toString()}`);

  return (
    <>
      <PageHeader title="Bookings" subtitle="Set the price, send the payment link, and track payments for every trip." />
      <ListFilters statuses={bookingStatuses.map((s) => ({ value: s, label: bookingStatusLabels[s] }))} />
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>No bookings match.</Empty></div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Package</th>
                  <th className="px-4 py-3 font-medium">Travel</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((b) => (
                  <tr key={b.id} className="hover:bg-cream">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/admin/bookings/${b.id}`} className="font-semibold hover:text-brand">{b.reference}</Link>
                      <p className="text-xs text-muted">{formatDate(b.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.customer.name}</p>
                      <p className="text-xs text-muted">{b.customer.phone}</p>
                    </td>
                    <td className="max-w-[16rem] px-4 py-3">{b.packageTitle}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatTravelMonth(b.travelMonth)} · {b.adults + b.children} pax
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{b.totalAmount === null ? <span className="text-muted">Not set</span> : formatINR(b.totalAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatINR(b.amountPaid)}</td>
                    <td className="px-4 py-3"><BookingBadge status={b.status} /></td>
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
