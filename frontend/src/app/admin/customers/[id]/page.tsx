"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Gift, Inbox, Phone, Trash2 } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import type { AdminCustomerDetail } from "@dilruba/shared/crm";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { WhatsAppIcon } from "@/components/icons";
import { BookingBadge, Card, Empty, ErrorBox, LeadBadge, Loading, NotesPanel, PageHeader, customerWhatsapp, formatDate } from "@/components/admin/ui";
import { useCan } from "@/components/admin/shell";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: c, setData, error, reload } = useAdminData<AdminCustomerDetail>(`/customers/${id}`);
  const action = useAction();
  const can = useCan();
  const canWrite = can("customers.write");
  // Owners and managers; customers with bookings are refused by the server (history is kept).
  const canDelete = canWrite && can("leads.all");
  const router = useRouter();
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
            {can("leads.write") && (
              <Link href={`/admin/leads/new?customer=${c.id}`} className="btn btn-outline !py-2">
                <Inbox className="size-4" aria-hidden /> Move to leads
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                disabled={action.busy}
                onClick={() => {
                  // Bookings carry payment history, so those customers are kept (the server checks too).
                  if (c.bookings.length > 0) {
                    action.setError(`${c.name} has ${c.bookings.length} booking${c.bookings.length === 1 ? "" : "s"}, so they can't be deleted (their payment history must be kept). Cancel the bookings instead.`);
                    return;
                  }
                  if (!window.confirm(`Delete ${c.name} with all their enquiries, quotes and notes? This can't be undone.`)) return;
                  void action.run(async () => {
                    await adminFetch(`/customers/${id}`, { method: "DELETE" });
                    router.replace("/admin/customers");
                  });
                }}
                className="btn btn-outline !py-2 text-brand hover:!border-brand disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden /> Delete
              </button>
            )}
          </>
        }
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
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
          <NotesPanel readOnly={!canWrite} notes={c.notes} onAdd={(body) => mutate("/notes", "POST", { body })} />
        </div>

        <div className="space-y-6">
        <Card title="Referrals">
          {c.referralCode ? (
            <>
              <p className="text-xs text-muted">Their code</p>
              <p className="font-display text-2xl font-semibold tracking-wide">{c.referralCode}</p>
              <a
                href={customerWhatsapp(c.phone, `Assalamu Alaikum ${c.name.split(" ")[0]}, JazakAllah Khair for travelling with us! If friends or family are planning Umrah, Hajj or a holiday, share your link: ${window.location.origin}/?ref=${c.referralCode} (or your code ${c.referralCode}) and we'll look after them just like you.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp mt-3 w-full !py-2"
              >
                <WhatsAppIcon className="size-4" /> Send their referral link
              </a>
            </>
          ) : (
            canWrite && <button type="button" disabled={action.busy} onClick={() => void mutate("/referral-code", "POST", undefined)} className="btn btn-outline w-full !py-2 disabled:opacity-50">
              <Gift className="size-4" aria-hidden /> Create a referral code
            </button>
          )}
          {c.referredBy && (
            <p className="mt-4 text-sm">Referred by <Link href={`/admin/customers/${c.referredBy.id}`} className="font-medium hover:text-brand">{c.referredBy.name}</Link></p>
          )}
          {c.referrals.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted">Has referred {c.referrals.length}</p>
              <ul className="mt-1 space-y-1 text-sm">
                {c.referrals.map((r) => <li key={r.id}><Link href={`/admin/customers/${r.id}`} className="hover:text-brand">{r.name}</Link></li>)}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Customers get their code automatically in the thank-you email after a trip.</p>
        </Card>

        <Card title="Details" className="h-fit">
          <form
            key={`${c.name}-${c.email}-${c.phone}`}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (await mutate("", "PATCH", { name: f.get("name"), email: f.get("email"), phone: f.get("phone") })) setSaved(true);
            }}
            className="grid gap-4"
          >
            <div>
              <label htmlFor="c-name" className="label">Name</label>
              <input id="c-name" name="name" defaultValue={c.name} required readOnly={!canWrite} className="field" />
            </div>
            <div>
              <label htmlFor="c-email" className="label">Email</label>
              <input id="c-email" name="email" type="email" defaultValue={c.email ?? ""} placeholder="Needed for booking emails" readOnly={!canWrite} className="field" />
            </div>
            <div>
              <label htmlFor="c-phone" className="label">Contact number</label>
              <input id="c-phone" name="phone" type="tel" defaultValue={c.phone} required readOnly={!canWrite} className="field" />
            </div>
            {canWrite && <button type="submit" disabled={action.busy} className="btn btn-outline disabled:opacity-50">Save</button>}
            {saved && <p role="status" className="text-sm text-[#0f7a3a]">Saved.</p>}
          </form>
        </Card>
        </div>
      </div>
    </>
  );
}
