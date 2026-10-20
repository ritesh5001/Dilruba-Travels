"use client";

import Link from "next/link";
import { formatINR } from "@dilruba/shared/booking";
import type { Dashboard } from "@dilruba/shared/crm";
import { useAdminData } from "@/lib/admin-api";
import { BookingBadge, Card, Empty, ErrorBox, LeadBadge, Loading, PageHeader, formatDate } from "@/components/admin/ui";

export default function AdminDashboardPage() {
  const { data, error } = useAdminData<Dashboard>("/dashboard");
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  const s = data.stats;

  const tiles = [
    { label: "New leads", value: String(s.newLeads), href: "/admin/leads?status=new", hint: `${s.leadsThisMonth} this month` },
    { label: "Bookings to action", value: String(s.openBookings), href: "/admin/bookings?status=requested", hint: "Requested or awaiting payment" },
    { label: "Confirmed bookings", value: String(s.confirmedBookings), href: "/admin/bookings?status=confirmed", hint: "Upcoming trips" },
    { label: "Received this month", value: formatINR(s.revenueThisMonth), href: "/admin/bookings", hint: `${formatINR(s.outstanding)} still to collect` },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="What needs attention today." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-black/5">
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{t.value}</p>
            <p className="mt-1 text-xs text-muted">{t.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Latest leads" actions={<Link href="/admin/leads" className="text-sm font-medium text-brand">View all</Link>}>
          {data.recentLeads.length === 0 ? (
            <Empty>No enquiries yet. They appear here when someone uses a form on the website.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentLeads.map((l) => (
                <li key={l.id}>
                  <Link href={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.customer.name}</p>
                      <p className="truncate text-sm text-muted">{l.packageName ?? l.service} · {formatDate(l.createdAt)}</p>
                    </div>
                    <LeadBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest bookings" actions={<Link href="/admin/bookings" className="text-sm font-medium text-brand">View all</Link>}>
          {data.recentBookings.length === 0 ? (
            <Empty>No bookings yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentBookings.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.reference} · {b.customer.name}</p>
                      <p className="truncate text-sm text-muted">{b.packageTitle}</p>
                    </div>
                    <BookingBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest payments" className="xl:col-span-2">
          {data.recentPayments.length === 0 ? (
            <Empty>No payments yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentPayments.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/bookings/${p.bookingId}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.customerName} · {p.reference}</p>
                      <p className="text-sm text-muted">
                        {formatDate(p.paidAt ?? p.createdAt, true)} · {p.provider === "manual" ? `Recorded (${p.method})` : `Online (${p.method ?? p.provider})`}
                      </p>
                    </div>
                    <span className="font-semibold">{formatINR(p.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
