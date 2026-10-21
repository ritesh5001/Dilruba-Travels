"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import type { AdminPackage } from "@dilruba/shared/catalog";
import type { AdminCustomer, AdminLeadDetail, Paged } from "@dilruba/shared/crm";
import { formatDay, todayIST, type AdminDeparture, type AdminQuote, type QuoteInput } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { Card, ErrorBox } from "./ui";

type Line = { label: string; quantity: string; unitPrice: string };

const addDays = (days: number) => new Date(Date.parse(`${todayIST()}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);
const rupees = (paise: number | null | undefined) => (paise == null ? "" : String(paise / 100));

/**
 * Create or edit a quote. A new quote starts from the lead (customer, package, dates, people) and
 * picking a package fills the title, inclusions and a first price line from its starting price.
 */
export function QuoteEditor({ quote, lead, onSaved }: { quote?: AdminQuote; lead?: AdminLeadDetail; onSaved?: (q: AdminQuote) => void }) {
  const router = useRouter();
  const action = useAction();
  const { data: packages } = useAdminData<AdminPackage[]>("/packages");

  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(
    quote ? { id: quote.customer.id, name: quote.customer.name } : lead ? { id: lead.customer.id, name: lead.customer.name } : null,
  );
  const [packageId, setPackageId] = useState<number | "">(quote?.packageId ?? "");
  const [departureId, setDepartureId] = useState<number | "">(quote?.departureId ?? "");
  const [title, setTitle] = useState(quote?.title ?? lead?.packageName ?? "");
  const [travelMonth, setTravelMonth] = useState(quote?.travelMonth ?? (lead?.travelMonth && /^\d{4}-\d{2}$/.test(lead.travelMonth) ? lead.travelMonth : ""));
  const [adults, setAdults] = useState(String(quote?.adults ?? lead?.travellers ?? 2));
  const [children, setChildren] = useState(String(quote?.children ?? 0));
  const [lines, setLines] = useState<Line[]>(
    quote?.items.map((i) => ({ label: i.label, quantity: String(i.quantity), unitPrice: rupees(i.unitPrice) })) ?? [{ label: "Package per person", quantity: String(lead?.travellers ?? 2), unitPrice: "" }],
  );
  const [discount, setDiscount] = useState(rupees(quote?.discount) || "0");
  const [deposit, setDeposit] = useState(rupees(quote?.deposit));
  const [validUntil, setValidUntil] = useState(quote?.validUntil ?? addDays(7));
  const [inclusions, setInclusions] = useState((quote?.inclusions ?? []).join("\n"));
  const [message, setMessage] = useState(quote?.message ?? "");

  const { data: departures } = useAdminData<AdminDeparture[]>(packageId ? `/departures?package=${packageId}` : null);

  const total = useMemo(() => {
    const sum = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
    return Math.max(0, sum - (Number(discount) || 0));
  }, [lines, discount]);

  function choosePackage(id: number | "") {
    setPackageId(id);
    setDepartureId("");
    const p = packages?.find((x) => x.id === id);
    if (!p) return;
    setTitle(p.title);
    setInclusions(p.inclusions.join("\n"));
    // Only fill the price line if staff haven't started pricing yet.
    if (p.startingPrice && lines.length === 1 && !lines[0]!.unitPrice) {
      setLines([{ label: `${p.title}${p.sharing ? ` (${p.sharing})` : ""}, per person`, quantity: adults, unitPrice: String(p.startingPrice) }]);
    }
  }

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return action.setError("Choose the customer first");
    const body: QuoteInput = {
      leadId: quote?.leadId ?? lead?.id ?? null,
      customerId: customer.id,
      packageId: packageId || null,
      departureId: departureId || null,
      title,
      travelMonth,
      adults: Number(adults),
      children: Number(children),
      items: lines.map((l) => ({ label: l.label, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) || 0 })),
      discount: Number(discount) || 0,
      deposit: deposit === "" ? null : Number(deposit),
      inclusions: inclusions.split("\n").map((s) => s.trim()).filter(Boolean),
      message: message.trim(),
      validUntil,
    };
    const saved = await action.run(() => adminFetch<AdminQuote>(quote ? `/quotes/${quote.id}` : "/quotes", { method: quote ? "PUT" : "POST", body }));
    if (!saved) return;
    if (quote) onSaved?.(saved);
    else router.replace(`/admin/quotes/${saved.id}`);
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {action.error && <ErrorBox message={action.error} />}
      <Card title="Trip">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="label">Customer</p>
            {customer ? (
              <p className="flex items-center gap-3 text-sm font-medium">
                {customer.name}
                {!quote && !lead && (
                  <button type="button" onClick={() => setCustomer(null)} className="text-xs font-normal text-brand">Change</button>
                )}
              </p>
            ) : (
              <CustomerPicker onPick={setCustomer} />
            )}
          </div>
          <div>
            <label htmlFor="q-package" className="label">Package <span className="font-normal text-muted">(optional)</span></label>
            <select id="q-package" value={packageId} onChange={(e) => choosePackage(e.target.value ? Number(e.target.value) : "")} className="field appearance-none">
              <option value="">Custom trip</option>
              {packages?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="q-departure" className="label">Group date <span className="font-normal text-muted">(optional)</span></label>
            <select id="q-departure" value={departureId} disabled={!packageId} onChange={(e) => setDepartureId(e.target.value ? Number(e.target.value) : "")} className="field appearance-none disabled:opacity-50">
              <option value="">{packageId ? (departures?.length ? "No fixed date" : "No upcoming dates") : "Pick a package first"}</option>
              {departures?.map((d) => (
                <option key={d.id} value={d.id} disabled={d.status === "closed"}>
                  {d.title} · {formatDay(d.startDate)} · {Math.max(0, d.seats - d.booked)} seats left
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="q-title" className="label">Quote title</label>
            <input id="q-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} placeholder="e.g. 15-day Economy Umrah, Ramadan 2027" className="field" />
          </div>
          <div>
            <label htmlFor="q-month" className="label">Travel month</label>
            <input id="q-month" type="month" value={travelMonth} onChange={(e) => setTravelMonth(e.target.value)} className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="q-adults" className="label">Adults</label>
              <input id="q-adults" type="number" min="1" max="200" value={adults} onChange={(e) => setAdults(e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="q-children" className="label">Children</label>
              <input id="q-children" type="number" min="0" max="200" value={children} onChange={(e) => setChildren(e.target.value)} className="field" />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Price">
        <div className="space-y-3">
          <div className="hidden grid-cols-[1fr_80px_130px_110px_36px] gap-2 text-xs uppercase tracking-wide text-muted sm:grid">
            <span>Description</span><span>Qty</span><span>Price each (₹)</span><span className="text-right">Amount</span><span />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_80px_130px_110px_36px] sm:items-center sm:border-0 sm:p-0">
              <input aria-label="Description" value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} required placeholder="e.g. Quad sharing, per person" className="field col-span-2 sm:col-span-1" />
              <input aria-label="Quantity" type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} required className="field" />
              <input aria-label="Price each in rupees" type="number" min="0" step="1" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} required className="field" />
              <span className="self-center text-right text-sm font-semibold">{formatINR((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * 100)}</span>
              <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1} className="justify-self-end rounded-full p-2 text-muted hover:bg-sand hover:text-brand disabled:opacity-30" aria-label="Remove line">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setLines((ls) => [...ls, { label: "", quantity: "1", unitPrice: "" }])} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
            <Plus className="size-4" aria-hidden /> Add a line (child price, extra night, single supplement…)
          </button>
        </div>
        <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
          <div>
            <label htmlFor="q-discount" className="label">Discount (₹)</label>
            <input id="q-discount" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="q-deposit" className="label">Deposit to confirm (₹)</label>
            <input id="q-deposit" type="number" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="Optional" className="field" />
          </div>
          <div>
            <label htmlFor="q-valid" className="label">Valid until</label>
            <input id="q-valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="field" />
          </div>
        </div>
        <p className="mt-4 text-right text-lg">Total <strong className="font-display text-2xl">{formatINR(total * 100)}</strong></p>
        <p className="text-right text-xs text-muted">Including GST. TCS on overseas packages is added on the booking.</p>
      </Card>

      <Card title="What the customer sees">
        <div className="grid gap-4">
          <div>
            <label htmlFor="q-inclusions" className="label">Included (one per line)</label>
            <textarea id="q-inclusions" rows={6} value={inclusions} onChange={(e) => setInclusions(e.target.value)} placeholder={"Return flights from Mumbai\nUmrah visa\nHotel 300m from Haram"} className="field" />
          </div>
          <div>
            <label htmlFor="q-message" className="label">Personal message <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="q-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Hotel names, flight timings, anything special about this offer…" className="field" />
          </div>
        </div>
      </Card>

      <button type="submit" disabled={action.busy} className="btn btn-primary disabled:opacity-60">
        {action.busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {quote ? "Save changes" : "Save draft"}
      </button>
    </form>
  );
}

function CustomerPicker({ onPick }: { onPick: (c: { id: number; name: string }) => void }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data } = useAdminData<Paged<AdminCustomer>>(search ? `/customers?q=${encodeURIComponent(search)}` : null);
  return (
    <div>
      <div className="flex gap-2">
        <label htmlFor="q-customer" className="sr-only">Find a customer</label>
        <input
          id="q-customer"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setSearch(q.trim());
            }
          }}
          placeholder="Search name or phone"
          className="field"
        />
        <button type="button" onClick={() => setSearch(q.trim())} className="btn btn-outline !py-2">Find</button>
      </div>
      {search && data && (
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
          {data.items.length === 0 && <li className="px-3 py-2 text-sm text-muted">No customer found. Add them as a lead first.</li>}
          {data.items.slice(0, 8).map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onPick({ id: c.id, name: c.name })} className="w-full px-3 py-2 text-left text-sm hover:bg-sand">
                <span className="font-medium">{c.name}</span> <span className="text-muted">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
