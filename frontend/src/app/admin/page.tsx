"use client";

import Link from "next/link";
import { AlertTriangle, BellRing, Cake, PlaneTakeoff, Wallet } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import type { Dashboard } from "@dilruba/shared/crm";
import { formatDay, todayIST } from "@dilruba/shared/ops";
import { useAdminData } from "@/lib/admin-api";
import { WhatsAppIcon } from "@/components/icons";
import { Badge, BookingBadge, Card, Empty, ErrorBox, LeadBadge, Loading, PageHeader, customerWhatsapp, formatDate } from "@/components/admin/ui";

export default function AdminDashboardPage() {
  const { data, error, reload } = useAdminData<Dashboard>("/dashboard");
  if (error) return <ErrorBox message={error} onRetry={reload} />;
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

      <div className="mt-6 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card
          title={`Follow-ups due${data.followUps.length ? ` (${data.followUps.length})` : ""}`}
          actions={<Link href="/admin/leads?status=followup" className="text-sm font-medium text-brand">View all</Link>}
        >
          {data.followUps.length === 0 ? (
            <Empty>No follow-ups due. Set a follow-up date on a lead and it appears here on the day.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.followUps.map((l) => {
                const overdue = todayIST(new Date(l.followUpAt!)) < todayIST();
                return (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.customer.name}</p>
                        <p className="truncate text-sm text-muted">
                          <BellRing className="mr-1 inline size-3.5" aria-hidden />
                          {l.followUpNote ?? l.packageName ?? l.service} · {formatDate(l.followUpAt!, true)}
                          {l.assignedTo ? ` · ${l.assignedTo.name}` : ""}
                        </p>
                      </div>
                      {overdue ? <Badge color="red">Overdue</Badge> : <Badge color="amber">Today</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Payments due this week">
          {data.instalmentsDue.length === 0 ? (
            <Empty>No instalments due. Add an instalment plan on a booking to track payment dates.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.instalmentsDue.map((i) => (
                <li key={`${i.bookingId}-${i.label}`} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/admin/bookings/${i.bookingId}`} className="min-w-0 hover:text-brand">
                    <p className="truncate font-medium">{i.customerName} · {i.reference}</p>
                    <p className="truncate text-sm text-muted">
                      <Wallet className="mr-1 inline size-3.5" aria-hidden />
                      {i.label} · {formatINR(i.outstanding)} · due {formatDay(i.dueDate)}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {i.dueDate < todayIST() ? <Badge color="red">Overdue</Badge> : <Badge color="blue">Due</Badge>}
                    <a
                      href={customerWhatsapp(i.phone, `Assalamu Alaikum ${i.customerName.split(" ")[0]}, a gentle reminder that ${formatINR(i.outstanding)} (${i.label}) is due on ${formatDay(i.dueDate)} for booking ${i.reference}. JazakAllah Khair.\n\nDilruba Travels`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-2 text-[#0f7a3a] hover:bg-sand"
                      title="Remind on WhatsApp"
                    >
                      <WhatsAppIcon className="size-4" />
                      <span className="sr-only">Remind on WhatsApp</span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Upcoming departures" actions={<Link href="/admin/departures" className="text-sm font-medium text-brand">View all</Link>}>
          {data.upcomingDepartures.length === 0 ? (
            <Empty>No departures in the next 90 days. Add group dates under Departures.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.upcomingDepartures.map((d) => {
                const pct = Math.min(100, Math.round((d.booked / d.seats) * 100));
                return (
                  <li key={d.id}>
                    <Link href={`/admin/departures/${d.id}`} className="block py-3 hover:bg-cream">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-medium"><PlaneTakeoff className="mr-1.5 inline size-4 text-brand" aria-hidden />{d.title}</p>
                        <span className="shrink-0 text-sm text-muted">{formatDay(d.startDate)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand" role="img" aria-label={`${d.booked} of ${d.seats} seats booked`}>
                          <div className={`h-full rounded-full ${pct >= 100 ? "bg-brand" : "bg-[#25d366]"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 text-xs text-muted">{d.booked}/{d.seats} seats</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Passports to fix">
          {data.passportAlerts.length === 0 ? (
            <Empty>All travellers on upcoming trips have valid passports on file.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.passportAlerts.map((a) => (
                <li key={a.travellerId}>
                  <Link href={`/admin/bookings/${a.bookingId}#travellers`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.name}</p>
                      <p className="truncate text-sm text-muted">{a.reference}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand">
                      <AlertTriangle className="size-3.5" aria-hidden /> {a.problem}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {data.birthdays.length > 0 && (
          <Card title="Birthdays this week" className="xl:col-span-2">
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.birthdays.map((b) => (
                <li key={b.travellerId} className="flex items-center justify-between gap-3 rounded-xl bg-sand px-3 py-2">
                  <Link href={`/admin/bookings/${b.bookingId}`} className="min-w-0 truncate text-sm font-medium hover:text-brand">
                    <Cake className="mr-1.5 inline size-4 text-gold" aria-hidden />{b.name} · {formatDay(b.date).replace(/ \d{4}$/, "")}
                  </Link>
                  {b.phone && (
                    <a
                      href={customerWhatsapp(b.phone, `Assalamu Alaikum ${b.name.split(" ")[0]}, wishing you a very happy birthday from all of us at Dilruba Travels! May Allah bless you with health and happiness.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[#0f7a3a]"
                      title="Send birthday wishes"
                    >
                      <WhatsAppIcon className="size-4" />
                      <span className="sr-only">Send birthday wishes</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

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
