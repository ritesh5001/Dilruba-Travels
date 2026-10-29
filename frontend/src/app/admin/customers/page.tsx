"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import type { AdminCustomer, Paged } from "@dilruba/shared/crm";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { Card, Empty, ErrorBox, ListFilters, Loading, PageHeader, Pagination, formatDate } from "@/components/admin/ui";
import { useCan } from "@/components/admin/shell";

export default function CustomersPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { data, error, reload } = useAdminData<Paged<AdminCustomer>>(`/customers?${params.toString()}`);
  const can = useCan();
  // Adding and deleting: owners and managers (the server checks too).
  const canManage = can("customers.write") && can("leads.all");
  const action = useAction();
  const [adding, setAdding] = useState(false);

  function remove(c: AdminCustomer) {
    // Bookings carry payment history, so those customers are kept.
    if (c.bookingCount > 0) {
      action.setError(`${c.name} has ${c.bookingCount} booking${c.bookingCount === 1 ? "" : "s"}, so they can't be deleted (their payment history must be kept). Cancel the bookings instead.`);
      return;
    }
    if (!window.confirm(`Delete ${c.name} with all their enquiries, quotes and notes? This can't be undone.`)) return;
    void action.run(async () => {
      await adminFetch(`/customers/${c.id}`, { method: "DELETE" });
      await reload();
    });
  }

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Everyone who has enquired or booked, matched by phone number."
        actions={canManage && !adding && <button type="button" onClick={() => setAdding(true)} className="btn btn-primary !py-2"><Plus className="size-4" aria-hidden /> Add customer</button>}
      />
      {adding && (
        <Card title="New customer" className="mb-6 max-w-3xl">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const created = await action.run(() =>
                adminFetch<{ id: number }>("/customers", { method: "POST", body: { name: f.get("name"), phone: f.get("phone"), email: f.get("email") } }),
              );
              if (created) router.push(`/admin/customers/${created.id}`);
            }}
            className="grid gap-4 sm:grid-cols-3"
          >
            <div>
              <label htmlFor="nc-name" className="label">Name</label>
              <input id="nc-name" name="name" required className="field" />
            </div>
            <div>
              <label htmlFor="nc-phone" className="label">Phone / WhatsApp</label>
              <input id="nc-phone" name="phone" type="tel" required placeholder="+91 98XXX XXXXX" className="field" />
            </div>
            <div>
              <label htmlFor="nc-email" className="label">Email <span className="font-normal text-muted">(optional)</span></label>
              <input id="nc-email" name="email" type="email" className="field" />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <button type="submit" disabled={action.busy} className="btn btn-primary !py-2 disabled:opacity-50">
                {action.busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save customer
              </button>
              <button type="button" onClick={() => { setAdding(false); action.setError(null); }} className="btn btn-outline !py-2">Cancel</button>
            </div>
          </form>
        </Card>
      )}
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
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
                  {canManage && <th className="px-4 py-3"><span className="sr-only">Delete</span></th>}
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
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={action.busy}
                          onClick={() => remove(c)}
                          title={c.bookingCount > 0 ? "Has bookings: can't be deleted" : `Delete ${c.name}`}
                          aria-label={`Delete ${c.name}`}
                          className={`rounded-full p-2 hover:bg-sand disabled:opacity-50 ${c.bookingCount > 0 ? "text-muted/50" : "text-muted hover:text-brand"}`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </td>
                    )}
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
