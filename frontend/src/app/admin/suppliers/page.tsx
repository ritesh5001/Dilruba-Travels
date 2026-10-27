"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import { supplierTypeLabels, type AdminSupplier, type AdminSupplierDetail } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { SupplierForm } from "@/components/admin/supplier-form";
import { Badge, Card, Empty, ErrorBox, Loading, PageHeader } from "@/components/admin/ui";

export default function SuppliersPage() {
  const router = useRouter();
  const { data, error, reload } = useAdminData<AdminSupplier[]>("/suppliers");
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const action = useAction();

  const shown = (data ?? []).filter((s) => !q.trim() || `${s.name} ${s.contactPerson ?? ""} ${s.phone ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  const owed = (data ?? []).reduce((sum, s) => sum + s.owed, 0);
  const paid = (data ?? []).reduce((sum, s) => sum + s.totalPaid, 0);

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Airlines, hotels, visa agents and transport: what each booking costs you with them, what you've paid and what you still owe."
        actions={!adding && <button type="button" onClick={() => setAdding(true)} className="btn btn-primary !py-2"><Plus className="size-4" aria-hidden /> Add supplier</button>}
      />
      {adding && (
        <Card title="New supplier" className="mb-6 max-w-3xl">
          {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
          <SupplierForm
            busy={action.busy}
            onCancel={() => setAdding(false)}
            onSave={async (body) => {
              const created = await action.run(() => adminFetch<AdminSupplierDetail>("/suppliers", { method: "POST", body }));
              if (created) router.push(`/admin/suppliers/${created.id}`);
            }}
          />
        </Card>
      )}

      {data && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Still to pay suppliers", value: formatINR(owed), alert: owed > 0 },
            { label: "Paid to suppliers", value: formatINR(paid) },
            { label: "Suppliers", value: String(data.filter((s) => s.active).length) },
          ].map((t) => (
            <div key={t.label} className="rounded-2xl border border-line bg-white p-5">
              <p className="text-sm text-muted">{t.label}</p>
              <p className={`mt-1 font-display text-3xl font-semibold ${t.alert ? "text-brand" : ""}`}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="relative mb-4 sm:w-80">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="sup-search" className="sr-only">Search suppliers</label>
        <input id="sup-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, contact, phone" className="field !pl-10" />
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>{data.length ? "No supplier matches." : "No suppliers yet. Add one, or add a cost on a booking and the supplier is created for you."}</Empty></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 text-right font-medium">Costs</th>
                <th className="px-4 py-3 text-right font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium">Owed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((s) => (
                <tr key={s.id} className={`hover:bg-cream ${s.active ? "" : "opacity-60"}`}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/suppliers/${s.id}`} className="font-medium hover:text-brand">{s.name}</Link>
                    <p className="text-xs text-muted">{supplierTypeLabels[s.type]}{!s.active && " · inactive"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{s.contactPerson ?? "—"}{s.phone && <p className="text-xs">{s.phone}</p>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatINR(s.totalCosts)}<p className="text-xs text-muted">{s.costCount} cost{s.costCount === 1 ? "" : "s"}</p></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatINR(s.totalPaid)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{s.owed > 0 ? <span className="font-semibold text-brand">{formatINR(s.owed)}</span> : <Badge color="green">Settled</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
