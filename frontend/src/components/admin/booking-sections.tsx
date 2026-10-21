"use client";

import { useState } from "react";
import { AlertTriangle, Bell, Check, FileText, Loader2, Pencil, Plus, Star, Trash2, Upload, UserPlus } from "lucide-react";
import { formatINR } from "@dilruba/shared/booking";
import type { AdminBookingDetail } from "@dilruba/shared/crm";
import {
  costCategories,
  costCategoryLabels,
  documentKindLabels,
  documentKinds,
  formatDay,
  genderLabels,
  genders,
  passportProblem,
  roomTypeLabels,
  roomTypes,
  todayIST,
  visaStatuses,
  visaStatusLabels,
  type AdminTraveller,
  type DocumentKind,
  type TravellerInput,
} from "@dilruba/shared/ops";
import { ApiError } from "@/lib/admin-api";
import { Card, Empty, InstalmentBadge, VisaBadge, formatDate } from "./ui";

type Mutate = (path: string, method: string, body?: unknown, message?: string) => Promise<boolean>;

/** When the trip ends, for the passport-validity check. */
function tripEnd(b: AdminBookingDetail) {
  if (b.departure) return b.departure.startDate;
  if (b.travelMonth) return `${b.travelMonth}-28`;
  return null;
}

// ---------------- Travellers ----------------

export function TravellersCard({ b, busy, mutate }: { b: AdminBookingDetail; busy: boolean; mutate: Mutate }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const missing = b.adults + b.children - b.travellers.length;

  return (
    <Card
      title={`Travellers (${b.travellers.length} of ${b.adults + b.children})`}
      actions={
        editing === null && (
          <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
            <UserPlus className="size-4" aria-hidden /> Add traveller
          </button>
        )
      }
    >
      <div id="travellers" className="scroll-mt-24" />
      {editing === "new" && (
        <TravellerForm
          initial={b.travellers.length === 0 ? { fullName: b.customer.name, phone: b.customer.phone } : {}}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (body) => {
            if (await mutate("/travellers", "POST", body, "Traveller added.")) setEditing(null);
          }}
        />
      )}
      {b.travellers.length === 0 && editing !== "new" ? (
        <Empty>Add each traveller with their passport details for the visa, hotel rooming list and bus seats.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {b.travellers.map((t) =>
            editing === t.id ? (
              <li key={t.id} className="py-3">
                <TravellerForm
                  initial={t}
                  busy={busy}
                  onCancel={() => setEditing(null)}
                  onSave={async (body) => {
                    if (await mutate(`/travellers/${t.id}`, "PUT", body, "Traveller saved.")) setEditing(null);
                  }}
                  onDelete={async () => {
                    if (window.confirm(`Remove ${t.fullName} and their documents?`) && (await mutate(`/travellers/${t.id}`, "DELETE", undefined, "Traveller removed."))) setEditing(null);
                  }}
                />
              </li>
            ) : (
              <TravellerRow key={t.id} t={t} bookingId={b.id} tripEnd={tripEnd(b)} busy={busy} mutate={mutate} onEdit={() => setEditing(t.id)} />
            ),
          )}
        </ul>
      )}
      {missing > 0 && b.travellers.length > 0 && <p className="mt-3 text-xs text-muted">{missing} more traveller{missing === 1 ? "" : "s"} to add.</p>}
    </Card>
  );
}

function TravellerRow({ t, bookingId, tripEnd, busy, mutate, onEdit }: { t: AdminTraveller; bookingId: number; tripEnd: string | null; busy: boolean; mutate: Mutate; onEdit: () => void }) {
  const problem = passportProblem(t, tripEnd);
  const [kind, setKind] = useState<DocumentKind>(t.documents.some((d) => d.kind === "passport") ? "photo" : "passport");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploadError(null);
    if (file.size > 8 * 1024 * 1024) return setUploadError("That file is over 8 MB. Take a smaller photo or compress the PDF.");
    setUploading(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/travellers/${t.id}/documents?kind=${kind}&filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new ApiError(data.error ?? "Upload failed", res.status);
      // Reload through the normal path so the booking (and its cache) update together.
      await mutate("", "GET", undefined, `${documentKindLabels[kind]} uploaded.`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {t.fullName}
            {t.gender && <span className="ml-2 text-sm font-normal text-muted">{genderLabels[t.gender]}</span>}
            {t.dateOfBirth && <span className="ml-2 text-sm font-normal text-muted">born {formatDay(t.dateOfBirth)}</span>}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {t.passportNumber ? `Passport ${t.passportNumber}` : "No passport number"}
            {t.passportExpiry && ` · expires ${formatDay(t.passportExpiry)}`}
            {t.mahram && ` · Mahram: ${t.mahram}`}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {t.roomType ? roomTypeLabels[t.roomType] : "Room not set"}
            {t.roomLabel && ` · ${t.roomLabel}`}
            {t.busSeat && ` · Bus seat ${t.busSeat}`}
          </p>
          {problem && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand">
              <AlertTriangle className="size-3.5" aria-hidden /> {problem}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <VisaBadge status={t.visaStatus} />
          <button type="button" onClick={onEdit} className="rounded-full p-2 text-muted hover:bg-sand hover:text-ink" aria-label={`Edit ${t.fullName}`}>
            <Pencil className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {t.documents.map((d) => (
          <span key={d.id} className="inline-flex items-center gap-1 rounded-full bg-sand py-1 pl-3 pr-1 text-xs">
            <a href={`/api/admin/bookings/${bookingId}/travellers/${t.id}/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-brand">
              <FileText className="size-3.5" aria-hidden /> {documentKindLabels[d.kind]}
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Delete ${d.filename}?`)) void mutate(`/travellers/${t.id}/documents/${d.id}`, "DELETE", undefined, "Document deleted.");
              }}
              className="rounded-full p-1 text-muted hover:bg-white hover:text-brand"
              aria-label={`Delete ${d.filename}`}
            >
              <Trash2 className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <label htmlFor={`doc-kind-${t.id}`} className="sr-only">Document type</label>
          <select id={`doc-kind-${t.id}`} value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} className="rounded-full border border-line bg-white px-2 py-1 text-xs">
            {documentKinds.map((k) => <option key={k} value={k}>{documentKindLabels[k]}</option>)}
          </select>
          <label className={`inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-xs font-medium hover:border-ink ${uploading ? "opacity-50" : ""}`}>
            {uploading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Upload className="size-3.5" aria-hidden />} Upload
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </label>
        </span>
      </div>
      {uploadError && <p role="alert" className="mt-2 text-xs font-medium text-brand">{uploadError}</p>}
    </li>
  );
}

function TravellerForm({
  initial,
  busy,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Partial<AdminTraveller>;
  busy: boolean;
  onSave: (body: TravellerInput) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const id = (k: string) => `tr-${initial.id ?? "new"}-${k}`;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => (f.get(k) as string | null) ?? "";
        void onSave({
          fullName: s("fullName"),
          gender: s("gender") as TravellerInput["gender"],
          dateOfBirth: s("dateOfBirth"),
          phone: s("phone"),
          passportNumber: s("passportNumber"),
          passportIssueDate: s("passportIssueDate"),
          passportExpiry: s("passportExpiry"),
          passportPlace: s("passportPlace"),
          nationality: s("nationality") || "Indian",
          mahram: s("mahram"),
          visaStatus: s("visaStatus") as TravellerInput["visaStatus"],
          roomType: s("roomType") as TravellerInput["roomType"],
          roomLabel: s("roomLabel"),
          busSeat: s("busSeat"),
          notes: s("notes"),
        });
      }}
      className="mb-4 grid gap-3 rounded-xl border border-line bg-cream p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="sm:col-span-2">
        <label htmlFor={id("name")} className="label">Full name (exactly as on passport)</label>
        <input id={id("name")} name="fullName" defaultValue={initial.fullName ?? ""} required className="field" />
      </div>
      <div>
        <label htmlFor={id("gender")} className="label">Gender</label>
        <select id={id("gender")} name="gender" defaultValue={initial.gender ?? ""} className="field appearance-none">
          <option value="">—</option>
          {genders.map((g) => <option key={g} value={g}>{genderLabels[g]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={id("dob")} className="label">Date of birth</label>
        <input id={id("dob")} name="dateOfBirth" type="date" defaultValue={initial.dateOfBirth ?? ""} max={todayIST()} className="field" />
      </div>
      <div>
        <label htmlFor={id("phone")} className="label">Phone</label>
        <input id={id("phone")} name="phone" type="tel" defaultValue={initial.phone ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor={id("nat")} className="label">Nationality</label>
        <input id={id("nat")} name="nationality" defaultValue={initial.nationality ?? "Indian"} className="field" />
      </div>
      <div>
        <label htmlFor={id("ppn")} className="label">Passport number</label>
        <input id={id("ppn")} name="passportNumber" defaultValue={initial.passportNumber ?? ""} autoCapitalize="characters" className="field uppercase" />
      </div>
      <div>
        <label htmlFor={id("ppi")} className="label">Issued on</label>
        <input id={id("ppi")} name="passportIssueDate" type="date" defaultValue={initial.passportIssueDate ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor={id("ppe")} className="label">Expires on</label>
        <input id={id("ppe")} name="passportExpiry" type="date" defaultValue={initial.passportExpiry ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor={id("ppp")} className="label">Place of issue</label>
        <input id={id("ppp")} name="passportPlace" defaultValue={initial.passportPlace ?? ""} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("mahram")} className="label">Mahram <span className="font-normal text-muted">(name and relation, for women)</span></label>
        <input id={id("mahram")} name="mahram" defaultValue={initial.mahram ?? ""} placeholder="e.g. Imran Khan (husband)" className="field" />
      </div>
      <div>
        <label htmlFor={id("visa")} className="label">Visa</label>
        <select id={id("visa")} name="visaStatus" defaultValue={initial.visaStatus ?? "not_started"} className="field appearance-none">
          {visaStatuses.map((v) => <option key={v} value={v}>{visaStatusLabels[v]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={id("room")} className="label">Room type</label>
        <select id={id("room")} name="roomType" defaultValue={initial.roomType ?? ""} className="field appearance-none">
          <option value="">—</option>
          {roomTypes.map((r) => <option key={r} value={r}>{roomTypeLabels[r]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={id("roomlabel")} className="label">Room / sharing group</label>
        <input id={id("roomlabel")} name="roomLabel" defaultValue={initial.roomLabel ?? ""} placeholder="e.g. Room A or 1204" className="field" />
      </div>
      <div>
        <label htmlFor={id("bus")} className="label">Bus seat</label>
        <input id={id("bus")} name="busSeat" defaultValue={initial.busSeat ?? ""} className="field" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <label htmlFor={id("notes")} className="label">Notes <span className="font-normal text-muted">(wheelchair, diet, medical…)</span></label>
        <input id={id("notes")} name="notes" defaultValue={initial.notes ?? ""} className="field" />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">Save traveller</button>
        <button type="button" onClick={onCancel} className="btn btn-outline !py-2">Cancel</button>
        {onDelete && (
          <button type="button" onClick={() => void onDelete()} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand">
            <Trash2 className="size-4" aria-hidden /> Remove traveller
          </button>
        )}
      </div>
    </form>
  );
}

// ---------------- Instalments ----------------

type PlanRow = { label: string; dueDate: string; amount: string };

export function InstalmentsCard({ b, busy, mutate }: { b: AdminBookingDetail; busy: boolean; mutate: Mutate }) {
  const [editing, setEditing] = useState(false);
  const payable = b.totalAmount === null ? null : b.totalAmount + b.tcsAmount;
  const [rows, setRows] = useState<PlanRow[]>([]);

  function startEditing() {
    if (b.instalments.length) {
      setRows(b.instalments.map((i) => ({ label: i.label, dueDate: i.dueDate, amount: String(i.amount / 100) })));
    } else if (payable) {
      // A sensible start: the deposit now, the rest in two parts before travel.
      const deposit = b.depositAmount ?? Math.round(payable / 4 / 100) * 100;
      const rest = payable - deposit;
      const half = Math.round(rest / 2 / 100) * 100;
      const travel = b.departure?.startDate ?? (b.travelMonth ? `${b.travelMonth}-01` : null);
      const before = (days: number) => (travel ? new Date(Date.parse(`${travel}T00:00:00Z`) - days * 864e5).toISOString().slice(0, 10) : todayIST());
      setRows([
        { label: "Deposit", dueDate: todayIST(), amount: String(deposit / 100) },
        { label: "Second payment", dueDate: before(60), amount: String(half / 100) },
        { label: "Final payment", dueDate: before(30), amount: String((rest - half) / 100) },
      ]);
    } else {
      setRows([{ label: "Deposit", dueDate: todayIST(), amount: "" }]);
    }
    setEditing(true);
  }

  const planned = rows.reduce((s, r) => s + Math.round((Number(r.amount) || 0) * 100), 0);
  const setRow = (i: number, patch: Partial<PlanRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Card
      title="Payment plan"
      actions={
        !editing && payable !== null && (
          <button type="button" onClick={startEditing} className="text-sm font-medium text-brand">{b.instalments.length ? "Edit plan" : "Set up instalments"}</button>
        )
      }
    >
      {payable === null ? (
        <p className="text-sm text-muted">Set the price first, then split it into instalments with due dates. Customers get an automatic email reminder before each one.</p>
      ) : editing ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await mutate("/instalments", "PUT", { instalments: rows.map((r) => ({ label: r.label, dueDate: r.dueDate, amount: Number(r.amount) })) }, "Payment plan saved.");
            if (ok) setEditing(false);
          }}
          className="space-y-2"
        >
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_150px_130px_36px]">
              <input aria-label="Instalment name" value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} required className="field col-span-2 sm:col-span-1" />
              <input aria-label="Due date" type="date" value={r.dueDate} onChange={(e) => setRow(i, { dueDate: e.target.value })} required className="field" />
              <input aria-label="Amount in rupees" type="number" min="1" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} required placeholder="₹" className="field" />
              <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="justify-self-end rounded-full p-2 text-muted hover:bg-sand hover:text-brand" aria-label="Remove instalment">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setRows((rs) => [...rs, { label: `Payment ${rs.length + 1}`, dueDate: todayIST(), amount: "" }])} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
            <Plus className="size-4" aria-hidden /> Add instalment
          </button>
          <p className={`text-sm ${planned === payable ? "text-[#0f7a3a]" : "text-muted"}`}>
            Planned {formatINR(planned)} of {formatINR(payable)} payable{planned !== payable && ` (${planned < payable ? `${formatINR(payable - planned)} not scheduled` : "too much"})`}
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">Save plan</button>
            <button type="button" onClick={() => setEditing(false)} className="btn btn-outline !py-2">Cancel</button>
            {b.instalments.length > 0 && (
              <button type="button" disabled={busy} onClick={async () => { if (await mutate("/instalments", "PUT", { instalments: [] }, "Payment plan removed.")) setEditing(false); }} className="ml-auto text-sm text-muted hover:text-brand">
                Remove plan
              </button>
            )}
          </div>
        </form>
      ) : b.instalments.length === 0 ? (
        <p className="text-sm text-muted">No instalments: the customer pays the deposit, then the balance. Set up instalments to give them dates and send automatic reminders.</p>
      ) : (
        <ul className="divide-y divide-line">
          {b.instalments.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-medium">{i.label} · {formatINR(i.amount)}</p>
                <p className="text-xs text-muted">
                  Due {formatDay(i.dueDate)}
                  {i.state === "part_paid" || (i.state === "overdue" && i.covered > 0) ? ` · ${formatINR(i.covered)} paid` : ""}
                  {i.reminderSentAt && ` · reminded ${formatDate(i.reminderSentAt)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <InstalmentBadge state={i.state} />
                {i.state !== "paid" && b.customer.email && (
                  <button type="button" disabled={busy} onClick={() => void mutate(`/instalments/${i.id}/remind`, "POST", undefined, `Reminder for ${i.label} emailed.`)} className="rounded-full p-1.5 text-muted hover:bg-sand hover:text-ink" title="Email a reminder now">
                    <Bell className="size-4" aria-hidden />
                    <span className="sr-only">Email a reminder for {i.label}</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------- Supplier costs & profit (owner) ----------------

export function CostsCard({ b, busy, mutate }: { b: AdminBookingDetail; busy: boolean; mutate: Mutate }) {
  const [adding, setAdding] = useState(false);
  const costs = b.costs ?? [];
  const totalCost = costs.reduce((s, c) => s + c.amount, 0);
  const unpaid = costs.filter((c) => !c.paid).reduce((s, c) => s + c.amount, 0);
  const margin = b.totalAmount === null ? null : b.totalAmount - totalCost;

  return (
    <Card title="Costs & profit" actions={<span className="text-xs text-muted">Only you can see this</span>}>
      <div className="mb-4 grid gap-4 rounded-xl bg-sand p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Selling price</p>
          <p className="text-sm font-medium">{formatINR(b.totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Costs</p>
          <p className="text-sm font-medium">{formatINR(totalCost)}{unpaid > 0 && <span className="block text-xs font-normal text-muted">{formatINR(unpaid)} still to pay suppliers</span>}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Profit</p>
          <p className={`text-sm font-semibold ${margin !== null && margin < 0 ? "text-brand" : "text-[#0f7a3a]"}`}>
            {margin === null ? "—" : formatINR(margin)}
            {margin !== null && b.totalAmount ? <span className="ml-1 text-xs font-normal text-muted">({Math.round((margin / b.totalAmount) * 100)}%)</span> : null}
          </p>
        </div>
      </div>
      {costs.length > 0 && (
        <ul className="divide-y divide-line">
          {costs.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{c.supplier}</p>
                <p className="text-xs text-muted">{costCategoryLabels[c.category]}{c.note ? ` · ${c.note}` : ""}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold">{formatINR(c.amount)}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void mutate(`/costs/${c.id}`, "PATCH", { paid: !c.paid })}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${c.paid ? "bg-[#25d366]/15 text-[#0f7a3a]" : "bg-amber/25 text-ink"}`}
                  title={c.paid ? "Paid to supplier (click to undo)" : "Not paid yet (click when paid)"}
                >
                  {c.paid && <Check className="size-3" aria-hidden />} {c.paid ? "Paid" : "Unpaid"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { if (window.confirm(`Delete ${c.supplier}?`)) void mutate(`/costs/${c.id}`, "DELETE"); }}
                  className="rounded-full p-1.5 text-muted hover:bg-sand hover:text-brand"
                  aria-label={`Delete cost ${c.supplier}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const ok = await mutate("/costs", "POST", { category: f.get("category"), supplier: f.get("supplier"), amount: Number(f.get("amount")), paid: f.get("paid") === "on", note: f.get("note") }, "Cost added.");
            if (ok) setAdding(false);
          }}
          className="mt-4 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
        >
          <div>
            <label htmlFor="cost-cat" className="label">Type</label>
            <select id="cost-cat" name="category" defaultValue="hotel" className="field appearance-none">
              {costCategories.map((c) => <option key={c} value={c}>{costCategoryLabels[c]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cost-supplier" className="label">Supplier</label>
            <input id="cost-supplier" name="supplier" required placeholder="e.g. Saudia, Hilton Makkah" className="field" />
          </div>
          <div>
            <label htmlFor="cost-amount" className="label">Amount (₹)</label>
            <input id="cost-amount" name="amount" type="number" min="1" required className="field" />
          </div>
          <div>
            <label htmlFor="cost-note" className="label">Note <span className="font-normal text-muted">(optional)</span></label>
            <input id="cost-note" name="note" placeholder="Invoice no., PNR…" className="field" />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="paid" className="size-4 accent-[var(--color-brand)]" /> Already paid to the supplier
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">Add cost</button>
            <button type="button" onClick={() => setAdding(false)} className="btn btn-outline !py-2">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn btn-outline mt-4 !py-2"><Plus className="size-4" aria-hidden /> Add a cost</button>
      )}
    </Card>
  );
}

// ---------------- Feedback ----------------

export function FeedbackCard({ b, busy, mutate }: { b: AdminBookingDetail; busy: boolean; mutate: Mutate }) {
  if (b.feedback) {
    return (
      <Card title="Customer feedback">
        <p className="flex items-center gap-0.5" aria-label={`${b.feedback.rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`size-5 ${n <= b.feedback!.rating ? "text-amber" : "text-line"}`} fill="currentColor" aria-hidden />
          ))}
        </p>
        {b.feedback.comment && <p className="mt-2 whitespace-pre-wrap text-sm">“{b.feedback.comment}”</p>}
        <p className="mt-2 text-xs text-muted">{formatDate(b.feedback.createdAt)}</p>
      </Card>
    );
  }
  if (b.status !== "completed") return null;
  return (
    <Card title="Customer feedback">
      <p className="text-sm text-muted">No rating yet. Happy customers are asked for a Google review; unhappy ones come straight to you.</p>
      {b.customer.email && (
        <button type="button" disabled={busy} onClick={() => void mutate("/feedback-request", "POST", undefined, "Feedback request emailed.")} className="btn btn-outline mt-3 w-full !py-2 disabled:opacity-50">
          Email the feedback request
        </button>
      )}
    </Card>
  );
}
