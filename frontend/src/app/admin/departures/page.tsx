"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { formatDay, type AdminDeparture } from "@dilruba/shared/ops";
import type { AdminDepartureDetail } from "@dilruba/shared/crm";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { DepartureForm } from "@/components/admin/departure-form";
import { Badge, Card, Empty, ErrorBox, Loading, PageHeader } from "@/components/admin/ui";

export default function DeparturesPage() {
  const router = useRouter();
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [adding, setAdding] = useState(false);
  const { data, error, reload } = useAdminData<AdminDeparture[]>(`/departures${when === "past" ? "?when=past" : ""}`);
  const action = useAction();

  return (
    <>
      <PageHeader
        title="Departures"
        subtitle="Fixed group dates with a seat limit. See who's booked, the passenger list and the rooming list."
        actions={!adding && <button type="button" onClick={() => setAdding(true)} className="btn btn-primary !py-2"><Plus className="size-4" aria-hidden /> Add departure</button>}
      />
      {adding && (
        <Card title="New departure" className="mb-6">
          {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
          <DepartureForm
            busy={action.busy}
            onCancel={() => setAdding(false)}
            onSave={async (body) => {
              const created = await action.run(() => adminFetch<AdminDepartureDetail>("/departures", { method: "POST", body }));
              if (created) router.push(`/admin/departures/${created.id}`);
            }}
          />
        </Card>
      )}
      <div className="mb-4 flex gap-1">
        {(["upcoming", "past"] as const).map((w) => (
          <button key={w} type="button" onClick={() => setWhen(w)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${when === w ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-line hover:text-ink"}`}>
            {w === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>{when === "upcoming" ? "No upcoming departures. Add your next group date." : "No past departures."}</Empty></div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((d) => {
            const left = d.seats - d.booked;
            const pct = Math.min(100, Math.round((d.booked / d.seats) * 100));
            return (
              <li key={d.id}>
                <Link href={`/admin/departures/${d.id}`} className="block rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-black/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{d.title}</p>
                      <p className="truncate text-sm text-muted">{d.packageTitle ?? "No package"}</p>
                    </div>
                    {d.status === "closed" ? <Badge>Closed</Badge> : left <= 0 ? <Badge color="red">Full</Badge> : left <= 5 ? <Badge color="amber">{left} left</Badge> : <Badge color="green">Open</Badge>}
                  </div>
                  <p className="mt-3 text-sm">{formatDay(d.startDate)}{d.endDate ? ` – ${formatDay(d.endDate)}` : ""}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand" role="img" aria-label={`${d.booked} of ${d.seats} seats booked`}>
                      <div className={`h-full rounded-full ${pct >= 100 ? "bg-brand" : "bg-[#25d366]"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="shrink-0 text-xs text-muted">{d.booked}/{d.seats}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
