"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { categoryNames, categorySlugs } from "@dilruba/shared/catalog";
import type { IntegrationStatus, Settings } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { Card, ErrorBox, Loading, PageHeader } from "@/components/admin/ui";

export default function SettingsPage() {
  const { data, setData, error, reload } = useAdminData<Settings>("/settings");
  const { data: integrations } = useAdminData<IntegrationStatus>("/settings/integrations");
  const action = useAction();
  const [saved, setSaved] = useState(false);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <>
      <PageHeader title="Settings" subtitle="Invoice details, tax rates, reminders and your Google review link." />
      <form
        key={JSON.stringify(data)}
        onSubmit={async (e) => {
          e.preventDefault();
          setSaved(false);
          const f = new FormData(e.currentTarget);
          const s = (k: string) => (f.get(k) as string) ?? "";
          const next = await action.run(() =>
            adminFetch<Settings>("/settings", {
              method: "PUT",
              body: {
                legalName: s("legalName"),
                address: s("address"),
                gstin: s("gstin"),
                invoicePrefix: s("invoicePrefix"),
                gstRate: Number(s("gstRate")),
                tcsRate: Number(s("tcsRate")),
                tcsCategories: f.getAll("tcsCategories"),
                bankDetails: s("bankDetails"),
                googleReviewUrl: s("googleReviewUrl"),
                referralOffer: s("referralOffer"),
                instalmentReminders: f.get("instalmentReminders") === "on",
                dailyDigest: f.get("dailyDigest") === "on",
                feedbackRequests: f.get("feedbackRequests") === "on",
                autoAssignLeads: f.get("autoAssignLeads") === "on",
                autoAcknowledge: f.get("autoAcknowledge") === "on",
              },
            }),
          );
          if (next) {
            setData(next);
            setSaved(true);
          }
        }}
        className="grid max-w-3xl gap-6"
      >
        {action.error && <ErrorBox message={action.error} />}
        <Card title="Invoices">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="s-legal" className="label">Legal name</label>
              <input id="s-legal" name="legalName" defaultValue={data.legalName} required className="field" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="s-address" className="label">Address</label>
              <textarea id="s-address" name="address" rows={2} defaultValue={data.address} className="field resize-none" />
            </div>
            <div>
              <label htmlFor="s-gstin" className="label">GSTIN</label>
              <input id="s-gstin" name="gstin" defaultValue={data.gstin} maxLength={15} placeholder="Leave empty if not registered" className="field uppercase" />
            </div>
            <div>
              <label htmlFor="s-prefix" className="label">Invoice number prefix</label>
              <input id="s-prefix" name="invoicePrefix" defaultValue={data.invoicePrefix} maxLength={12} className="field" />
              <p className="mt-1 text-xs text-muted">Numbers look like {data.invoicePrefix}2026-27/0001</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="s-bank" className="label">Bank details printed on invoices</label>
              <textarea id="s-bank" name="bankDetails" rows={3} defaultValue={data.bankDetails} placeholder={"Bank, account name, account number, IFSC\nUPI ID"} className="field resize-none" />
            </div>
          </div>
        </Card>

        <Card title="Taxes">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-gst" className="label">GST on tour packages (%)</label>
              <input id="s-gst" name="gstRate" type="number" min="0" max="28" step="0.01" defaultValue={data.gstRate} className="field" />
              <p className="mt-1 text-xs text-muted">Prices you enter include GST; invoices show the split.</p>
            </div>
            <div>
              <label htmlFor="s-tcs" className="label">TCS on overseas packages (%)</label>
              <input id="s-tcs" name="tcsRate" type="number" min="0" max="20" step="0.01" defaultValue={data.tcsRate} className="field" />
              <p className="mt-1 text-xs text-muted">Budget 2026 set a flat 2% from 1 April 2026. Confirm with your CA.</p>
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="label">TCS applies to</legend>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                {categorySlugs.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="tcsCategories" value={c} defaultChecked={data.tcsCategories.includes(c)} className="size-4 accent-[var(--color-brand)]" /> {categoryNames[c]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Card>

        <Card title="Reviews & referrals">
          <div className="grid gap-4">
            <div>
              <label htmlFor="s-review" className="label">Google review link</label>
              <input id="s-review" name="googleReviewUrl" type="url" defaultValue={data.googleReviewUrl} placeholder="https://g.page/r/…/review" className="field" />
              <p className="mt-1 text-xs text-muted">Google Business Profile → Ask for reviews → copy the link. Customers who rate 4 or 5 stars are invited to post a review.</p>
            </div>
            <div>
              <label htmlFor="s-referral" className="label">Referral offer <span className="font-normal text-muted">(optional)</span></label>
              <input id="s-referral" name="referralOffer" defaultValue={data.referralOffer} maxLength={200} placeholder="e.g. You both get ₹2,000 off your next trip." className="field" />
              <p className="mt-1 text-xs text-muted">Shown in the thank-you email next to the customer&apos;s referral code.</p>
            </div>
          </div>
        </Card>

        <Card title="New leads">
          <div className="grid gap-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="autoAssignLeads" defaultChecked={data.autoAssignLeads} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
              <span>
                <strong>Assign website leads automatically</strong> to the Sales person with the fewest open leads (Managers if there are no Sales staff).
                A returning customer goes back to whoever handled them before. They get an alert in the panel.
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="autoAcknowledge" defaultChecked={data.autoAcknowledge} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
              <span>
                <strong>Thank the customer straight away</strong> by email (when they give one), naming who will call them.
              </span>
            </label>
          </div>
        </Card>

        <Card title="Connected services">
          {!integrations ? (
            <p className="text-sm text-muted">Checking…</p>
          ) : (
            <ul className="grid gap-3 text-sm">
              {[
                { on: integrations.email, name: "Email (Resend)", off: "Emails are not being sent. Add RESEND_API_KEY on the server." },
                { on: integrations.onlinePayments, name: "Online payments (Razorpay)", off: "Not connected: customers can't pay online. Add the Razorpay keys on the server." },
              ].map((i) => (
                <li key={i.name} className="flex items-start gap-3">
                  <span className={`mt-1 size-2.5 shrink-0 rounded-full ${i.on ? "bg-[#25d366]" : "bg-amber"}`} aria-hidden />
                  <span>
                    <strong>{i.name}</strong> · {i.on ? "connected" : "not connected"}
                    {!i.on && <span className="block text-xs text-muted">{i.off}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Automatic emails">
          <div className="grid gap-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="instalmentReminders" defaultChecked={data.instalmentReminders} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
              <span><strong>Payment reminders</strong> to customers 3 days before an instalment is due, and once if it&apos;s overdue.</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="dailyDigest" defaultChecked={data.dailyDigest} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
              <span><strong>Morning summary</strong> to you at 8am: follow-ups, payments due, passport problems, upcoming departures.</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="feedbackRequests" defaultChecked={data.feedbackRequests} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
              <span><strong>Feedback request</strong> with their referral code when a booking is marked completed.</span>
            </label>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={action.busy} className="btn btn-primary disabled:opacity-60">{action.busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save settings</button>
          {saved && <p role="status" className="text-sm text-[#0f7a3a]">Saved.</p>}
        </div>
      </form>
    </>
  );
}
