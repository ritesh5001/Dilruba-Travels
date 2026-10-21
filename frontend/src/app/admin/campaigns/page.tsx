"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { formatINR, formatTravelMonth } from "@dilruba/shared/booking";
import { categoryNames, categorySlugs, type CategorySlug } from "@dilruba/shared/catalog";
import { audienceSegments, type AudienceRow, type AudienceSegment } from "@dilruba/shared/ops";
import { useAdminData } from "@/lib/admin-api";
import { WhatsAppIcon } from "@/components/icons";
import { Card, Empty, ErrorBox, Loading, PageHeader, customerWhatsapp, exportUrl } from "@/components/admin/ui";

const presets = [
  { label: "Ramadan Umrah offer", text: "Assalamu Alaikum {name}, Ramadan is coming! Our Ramadan Umrah groups from Mumbai are now open with hotels close to the Haram. As a valued past traveller, reply to this message for priority seats." },
  { label: "Hajj registrations open", text: "Assalamu Alaikum {name}, Hajj registrations for the coming season are now open. Seats are limited; reply to this message and we'll guide you through every step." },
  { label: "Refer a friend", text: "Assalamu Alaikum {name}, JazakAllah Khair for travelling with us. If a friend or relative is planning Umrah or a holiday, share your code {code}. They'll be looked after just like you were." },
  { label: "Come back (enquired before)", text: "Assalamu Alaikum {name}, you asked us about a trip a while ago. We have new dates and prices; would you like me to send you today's best options?" },
];

/**
 * Pick a group of customers (past travellers, people who enquired but never booked) and message
 * them one by one on WhatsApp, or download the list for a broadcast tool or email campaign.
 */
export default function CampaignsPage() {
  const [segment, setSegment] = useState<AudienceSegment>("travelled");
  const [category, setCategory] = useState<CategorySlug | "">("");
  const [before, setBefore] = useState("");
  const [message, setMessage] = useState(presets[0]!.text);
  const [sent, setSent] = useState<Set<number>>(new Set());

  const query = new URLSearchParams({ segment, ...(category ? { category } : {}), ...(before ? { before } : {}) }).toString();
  const { data, error, reload } = useAdminData<AudienceRow[]>(`/reports/audience?${query}`);

  const personalise = (r: AudienceRow) => message.replaceAll("{name}", r.name.split(" ")[0]!).replaceAll("{code}", r.referralCode ?? "");

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Bring past customers back before Ramadan and Hajj season, and follow up old enquiries."
        actions={<a href={exportUrl(`customers.csv?${query}`)} className="btn btn-outline !py-2"><Download className="size-4" aria-hidden /> Download list</a>}
      />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card title="Who">
            <div className="grid gap-4">
              <div>
                <label htmlFor="cm-segment" className="label">Customers</label>
                <select id="cm-segment" value={segment} onChange={(e) => setSegment(e.target.value as AudienceSegment)} className="field appearance-none">
                  {(Object.keys(audienceSegments) as AudienceSegment[]).map((s) => <option key={s} value={s}>{audienceSegments[s]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cm-category" className="label">{segment === "enquired" ? "Enquired about" : "Travelled on"}</label>
                <select id="cm-category" value={category} onChange={(e) => setCategory(e.target.value as CategorySlug | "")} className="field appearance-none">
                  <option value="">Anything</option>
                  {categorySlugs.map((c) => <option key={c} value={c}>{categoryNames[c]}</option>)}
                </select>
              </div>
              {segment === "travelled" && (
                <div>
                  <label htmlFor="cm-before" className="label">Last trip booked before <span className="font-normal text-muted">(optional)</span></label>
                  <input id="cm-before" type="date" value={before} onChange={(e) => setBefore(e.target.value)} className="field" />
                  <p className="mt-1 text-xs text-muted">e.g. a year ago, to reach people due for their next Umrah.</p>
                </div>
              )}
            </div>
          </Card>
          <Card title="Message">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button key={p.label} type="button" onClick={() => setMessage(p.text)} className="rounded-full bg-sand px-3 py-1 text-xs hover:bg-line">{p.label}</button>
              ))}
            </div>
            <label htmlFor="cm-message" className="sr-only">Message</label>
            <textarea id="cm-message" rows={7} value={message} onChange={(e) => setMessage(e.target.value)} className="field" />
            <p className="mt-2 text-xs text-muted">{"{name}"} becomes their first name, {"{code}"} their referral code. WhatsApp opens with the message ready; you press send.</p>
          </Card>
        </div>

        <Card title={data ? `${data.length} customer${data.length === 1 ? "" : "s"}` : "Customers"}>
          {error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : !data ? (
            <Loading />
          ) : data.length === 0 ? (
            <Empty>Nobody matches. Try a different filter.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.map((r) => (
                <li key={r.customerId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="truncate text-sm text-muted">
                      {r.phone}
                      {r.lastTrip ? ` · ${r.lastTrip} (${formatTravelMonth(r.lastTravelMonth)})` : ""}
                      {r.totalPaid ? ` · ${formatINR(r.totalPaid)} paid` : ""}
                    </p>
                  </div>
                  <a
                    href={customerWhatsapp(r.phone, personalise(r))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSent((s) => new Set(s).add(r.customerId))}
                    className={`btn !px-3 !py-1.5 text-sm ${sent.has(r.customerId) ? "btn-outline text-muted" : "btn-whatsapp"}`}
                  >
                    <WhatsAppIcon className="size-4" /> {sent.has(r.customerId) ? "Opened" : "Message"}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
