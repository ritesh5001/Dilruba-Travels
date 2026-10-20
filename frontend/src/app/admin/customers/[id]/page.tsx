"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Phone } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import type { AdminCustomerDetail } from "@dilruba/shared/crm";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { WhatsAppIcon } from "@/components/icons";
import { BookingBadge, Card, Empty, ErrorBox, LeadBadge, Loading, NotesPanel, PageHeader, customerWhatsapp, formatDate } from "@/components/admin/ui";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: c, setData, error, reload } = useAdminData<AdminCustomerDetail>(`/customers/${id}`);
  const action = useAction();
  const [saved, setSaved] = useState(false);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!c) return <Loading />;

  async function mutate(path: string, method: string, body: unknown) {
    setSaved(false);
    const updated = await action.run(() => adminFetch<AdminCustomerDetail>(`/customers/${id}${path}`, { method, body }));
    if (updated) setData(updated);
    return !!updated;
  }

  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={c.name}
        subtitle={`Customer since ${formatDate(c.createdAt)}`}
        actions={
          <>
            <a href={customerWhatsapp(c.phone, `Assalamu Alaikum ${c.name.split(" ")[0]}, this is Dilruba Travels.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp !py-2">
              <WhatsAppIcon className="size-4" /> WhatsApp
            </a>
            <a href={`tel:${c.phone}`} className="btn btn-outline !py-2"><Phone className="size-4" aria-hidden /> Call</a>
          </>
        }
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title="Bookings">
            {c.bookings.length === 0 ? (
              <Empty>No bookings yet.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {c.bookings.map((b) => (
                  <li key={b.id}>
                    <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{b.reference} · {b.packageTitle}</p>
                        <p className="text-sm text-muted">{formatDate(b.createdAt)} · paid {formatINR(b.amountPaid)}{b.totalAmount !== null ? ` of ${formatINR(b.totalAmount)}` : ""}</p>
                      </div>
                      <BookingBadge status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Enquiries">
            {c.leads.length === 0 ? (
              <Empty>No enquiries.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {c.leads.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.packageName ?? l.service}</p>
                        <p className="text-sm text-muted">{formatDate(l.createdAt)}</p>
                      </div>
                      <LeadBadge status={l.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <NotesPanel notes={c.notes} onAdd={(body) => mutate("/notes", "POST", { body })} />
        </div>

        <Card title="Details" className="h-fit">
          <form
            key={`${c.name}-${c.email}`}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (await mutate("", "PATCH", { name: f.get("name"), email: f.get("email") })) setSaved(true);
            }}
            className="grid gap-4"
          >
            <div>
              <label htmlFor="c-name" className="label">Name</label>
              <input id="c-name" name="name" defaultValue={c.name} required className="field" />
            </div>
            <div>
              <label htmlFor="c-email" className="label">Email</label>
              <input id="c-email" name="email" type="email" defaultValue={c.email ?? ""} placeholder="Needed for booking emails" className="field" />
            </div>
            <div>
              <p className="label">Phone</p>
              <p className="text-sm">{c.phone}</p>
              <p className="mt-1 text-xs text-muted">The phone number identifies the customer, so it can&apos;t be edited here.</p>
            </div>
            <button type="submit" disabled={action.busy} className="btn btn-outline disabled:opacity-50">Save</button>
            {saved && <p role="status" className="text-sm text-[#0f7a3a]">Saved.</p>}
          </form>
        </Card>
      </div>
    </>
  );
}
