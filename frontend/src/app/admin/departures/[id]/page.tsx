"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Download, Pencil, Printer, Trash2 } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import type { AdminDepartureDetail } from "@dilruba/shared/crm";
import { formatDay, passportProblem, roomTypeLabels } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { DepartureForm } from "@/components/admin/departure-form";
import { BookingBadge, Card, Empty, ErrorBox, Loading, PageHeader, VisaBadge, exportUrl } from "@/components/admin/ui";

export default function DepartureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: d, setData, error, reload } = useAdminData<AdminDepartureDetail>(`/departures/${id}`);
  const action = useAction();
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<"manifest" | "rooms">("manifest");

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!d) return <Loading />;

  const left = d.seats - d.booked;
  const tripEnd = d.endDate ?? d.startDate;
  const issues = d.travellers.filter((t) => passportProblem(t, tripEnd)).length;
  const missing = d.booked - d.travellers.length;
  const visasDone = d.travellers.filter((t) => t.visaStatus === "approved").length;

  // Rooming list: people grouped by their room label (unassigned last).
  const rooms = new Map<string, typeof d.travellers>();
  for (const t of d.travellers) {
    const key = t.roomLabel ? `${t.roomLabel}${t.roomType ? ` · ${roomTypeLabels[t.roomType]}` : ""}` : "";
    rooms.set(key, [...(rooms.get(key) ?? []), t]);
  }
  const roomList = [...rooms.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "en", { numeric: true })));

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          back={{ href: "/admin/departures", label: "Departures" }}
          title={d.title}
          subtitle={<>{formatDay(d.startDate)}{d.endDate ? ` – ${formatDay(d.endDate)}` : ""} · {d.packageTitle ?? "No package"} · {d.status === "closed" ? "Closed" : left <= 0 ? "Full" : `${left} seats left`}</>}
          actions={
            <>
              <a href={exportUrl(`manifest.csv?departure=${d.id}`)} className="btn btn-outline !py-2"><Download className="size-4" aria-hidden /> Manifest (Excel)</a>
              <button type="button" onClick={() => window.print()} className="btn btn-outline !py-2"><Printer className="size-4" aria-hidden /> Print</button>
              {!editing && <button type="button" onClick={() => setEditing(true)} className="btn btn-outline !py-2"><Pencil className="size-4" aria-hidden /> Edit</button>}
            </>
          }
        />
        {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}

        {editing && (
          <Card title="Edit departure" className="mb-6">
            <DepartureForm
              initial={d}
              busy={action.busy}
              onCancel={() => setEditing(false)}
              onSave={async (body) => {
                const updated = await action.run(() => adminFetch<AdminDepartureDetail>(`/departures/${id}`, { method: "PUT", body }));
                if (updated) {
                  setData(updated);
                  setEditing(false);
                }
              }}
            />
            {d.bookings.length === 0 && (
              <button
                type="button"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await adminFetch(`/departures/${id}`, { method: "DELETE" });
                    router.replace("/admin/departures");
                  })
                }
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand"
              >
                <Trash2 className="size-4" aria-hidden /> Delete departure
              </button>
            )}
          </Card>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Seats booked", value: `${d.booked} / ${d.seats}` },
            { label: "Traveller details", value: missing > 0 ? `${missing} missing` : "Complete" },
            { label: "Passport problems", value: String(issues), alert: issues > 0 },
            { label: "Visas approved", value: `${visasDone} / ${d.travellers.length}` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-muted">{s.label}</p>
              <p className={`mt-1 font-display text-2xl font-semibold ${s.alert ? "text-brand" : ""}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <Card title={`Bookings (${d.bookings.length})`} className="mb-6">
          {d.bookings.length === 0 ? (
            <Empty>No bookings on this date yet. Choose this group date on a booking or quote, or customers pick it when booking online.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.bookings.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.reference} · {b.customer.name}</p>
                      <p className="text-sm text-muted">{b.adults + b.children} travellers · paid {formatINR(b.amountPaid)}{b.totalAmount !== null ? ` of ${formatINR(b.totalAmount + b.tcsAmount)}` : ""}</p>
                    </div>
                    <BookingBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="mb-4 flex gap-1">
          {(["manifest", "rooms"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${view === v ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-line hover:text-ink"}`}>
              {v === "manifest" ? "Passenger list" : "Rooming list"}
            </button>
          ))}
        </div>
      </div>

      <h2 className="mb-3 hidden text-xl font-semibold print:block">{d.title} · {formatDay(d.startDate)} · {view === "manifest" ? "Passenger list" : "Rooming list"}</h2>
      {d.travellers.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>Add travellers on each booking to build the passenger and rooming lists.</Empty></div>
      ) : view === "manifest" ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white print:border-0">
          <table className="w-full min-w-[900px] text-left text-sm print:min-w-0 print:text-xs">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Passport</th>
                <th className="px-3 py-3 font-medium">Expires</th>
                <th className="px-3 py-3 font-medium">Born</th>
                <th className="px-3 py-3 font-medium">Mahram</th>
                <th className="px-3 py-3 font-medium">Room</th>
                <th className="px-3 py-3 font-medium">Visa</th>
                <th className="px-3 py-3 font-medium">Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {d.travellers.map((t, i) => {
                const problem = passportProblem(t, tripEnd);
                return (
                  <tr key={t.id}>
                    <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{t.fullName}</td>
                    <td className="px-3 py-2.5">
                      {t.passportNumber ?? "—"}
                      {problem && <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-semibold text-brand" title={problem}><AlertTriangle className="size-3.5" aria-hidden /><span className="sr-only">{problem}</span></span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatDay(t.passportExpiry)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatDay(t.dateOfBirth)}</td>
                    <td className="px-3 py-2.5">{t.mahram ?? "—"}</td>
                    <td className="px-3 py-2.5">{t.roomLabel ?? "—"}{t.roomType ? <span className="text-muted"> ({t.roomType})</span> : ""}</td>
                    <td className="px-3 py-2.5"><VisaBadge status={t.visaStatus} /></td>
                    <td className="px-3 py-2.5"><Link href={`/admin/bookings/${t.bookingId}`} className="hover:text-brand">{t.reference}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
          {roomList.map(([room, people]) => (
            <section key={room || "none"} className={`rounded-2xl border bg-white p-4 ${room ? "border-line" : "border-dashed border-brand/40"}`}>
              <h3 className="font-semibold">{room || "No room assigned"}</h3>
              <ol className="mt-2 space-y-1 text-sm">
                {people.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <span>{t.fullName}</span>
                    <span className="text-muted">{t.reference}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
      {view === "rooms" && <p className="mt-3 text-xs text-muted print:hidden">Set each traveller&apos;s room type and room name on their booking (e.g. everyone sharing “Room A” is grouped together).</p>}
    </>
  );
}
