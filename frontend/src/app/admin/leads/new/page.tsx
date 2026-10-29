"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { services } from "@dilruba/shared/enquiry";
import type { AdminCustomerDetail } from "@dilruba/shared/crm";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { Card, ErrorBox, Loading, PageHeader } from "@/components/admin/ui";

const sources = ["Phone call", "WhatsApp", "Walk-in", "Instagram", "Facebook", "Referral", "Repeat customer", "Other"];

/** A lead that came in by phone, WhatsApp or at the office, so every enquiry is tracked in one place. */
export default function NewLeadPage() {
  const router = useRouter();
  const action = useAction();
  // From a customer's page ("Move to leads"): their details are filled in, and the lead joins their record.
  const customerId = useSearchParams().get("customer");
  const { data: customer, error } = useAdminData<AdminCustomerDetail>(customerId ? `/customers/${customerId}` : null);

  if (customerId && error) return <ErrorBox message={error} />;
  if (customerId && !customer) return <Loading />;

  return (
    <>
      <PageHeader
        back={customer ? { href: `/admin/customers/${customer.id}`, label: customer.name } : { href: "/admin/leads", label: "Leads" }}
        title={customer ? `New lead for ${customer.name}` : "Add a lead"}
        subtitle={customer ? "Their name and phone are filled in. Add what they're asking about." : "For enquiries by phone, WhatsApp or at the office."}
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
      <Card className="max-w-3xl">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const text = (k: string) => (f.get(k) as string).trim() || undefined;
            const created = await action.run(() =>
              adminFetch<{ id: number }>("/leads", {
                method: "POST",
                body: {
                  name: text("name"),
                  phone: text("phone"),
                  email: text("email") ?? "",
                  service: f.get("service"),
                  packageName: text("packageName"),
                  travelMonth: text("travelMonth"),
                  travellers: text("travellers") ? Number(f.get("travellers")) : undefined,
                  message: text("message"),
                  source: f.get("source"),
                  assignToMe: f.get("assignToMe") === "on",
                },
              }),
            );
            if (created) router.push(`/admin/leads/${created.id}`);
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div>
            <label htmlFor="nl-name" className="label">Name</label>
            <input id="nl-name" name="name" required defaultValue={customer?.name} className="field" />
          </div>
          <div>
            <label htmlFor="nl-phone" className="label">Phone / WhatsApp</label>
            <input id="nl-phone" name="phone" type="tel" required placeholder="+91 98XXX XXXXX" defaultValue={customer?.phone} readOnly={!!customer} className="field read-only:bg-cream" />
          </div>
          <div>
            <label htmlFor="nl-email" className="label">Email <span className="font-normal text-muted">(optional)</span></label>
            <input id="nl-email" name="email" type="email" defaultValue={customer?.email ?? ""} className="field" />
          </div>
          <div>
            <label htmlFor="nl-source" className="label">How did they contact us?</label>
            <select id="nl-source" name="source" defaultValue={customer ? "Repeat customer" : "Phone call"} className="field appearance-none">
              {sources.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="nl-service" className="label">Interested in</label>
            <select id="nl-service" name="service" defaultValue="Umrah" className="field appearance-none">
              {services.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="nl-package" className="label">Package <span className="font-normal text-muted">(optional)</span></label>
            <input id="nl-package" name="packageName" placeholder="e.g. Ramadan Umrah 15 days" className="field" />
          </div>
          <div>
            <label htmlFor="nl-month" className="label">Travel month</label>
            <input id="nl-month" name="travelMonth" type="month" className="field" />
          </div>
          <div>
            <label htmlFor="nl-pax" className="label">Travellers</label>
            <input id="nl-pax" name="travellers" type="number" min="1" max="99" className="field" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="nl-message" className="label">Notes</label>
            <textarea id="nl-message" name="message" rows={3} placeholder="Budget, room sharing, special needs…" className="field resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="assignToMe" defaultChecked className="size-4 accent-[var(--color-brand)]" /> Assign to me
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={action.busy} className="btn btn-primary disabled:opacity-60">
              {action.busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save lead
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
