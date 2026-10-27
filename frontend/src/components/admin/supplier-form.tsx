"use client";

import { Loader2 } from "lucide-react";
import { supplierTypeLabels, supplierTypes, type AdminSupplier } from "@dilruba/shared/ops";

/** Add or edit a supplier's details. */
export function SupplierForm({ initial, busy, onSave, onCancel }: { initial?: AdminSupplier; busy: boolean; onSave: (body: unknown) => void; onCancel: () => void }) {
  const id = (k: string) => `sup-${initial?.id ?? "new"}-${k}`;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          name: f.get("name"),
          type: f.get("type"),
          contactPerson: f.get("contactPerson"),
          phone: f.get("phone"),
          email: f.get("email"),
          notes: f.get("notes"),
          active: f.get("active") === "on",
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor={id("name")} className="label">Name</label>
        <input id={id("name")} name="name" defaultValue={initial?.name} required placeholder="e.g. Saudia, Hilton Makkah, Al Haram Transport" className="field" />
      </div>
      <div>
        <label htmlFor={id("type")} className="label">Service</label>
        <select id={id("type")} name="type" defaultValue={initial?.type ?? "hotel"} className="field appearance-none">
          {supplierTypes.map((t) => <option key={t} value={t}>{supplierTypeLabels[t]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={id("contact")} className="label">Contact person</label>
        <input id={id("contact")} name="contactPerson" defaultValue={initial?.contactPerson ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor={id("phone")} className="label">Phone / WhatsApp</label>
        <input id={id("phone")} name="phone" type="tel" defaultValue={initial?.phone ?? ""} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("email")} className="label">Email</label>
        <input id={id("email")} name="email" type="email" defaultValue={initial?.email ?? ""} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("notes")} className="label">Notes <span className="font-normal text-muted">(bank details, rates, terms…)</span></label>
        <textarea id={id("notes")} name="notes" rows={3} defaultValue={initial?.notes ?? ""} className="field resize-none" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="size-4 accent-[var(--color-brand)]" /> Active (offered when adding costs)
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">{busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save</button>
        <button type="button" onClick={onCancel} className="btn btn-outline !py-2">Cancel</button>
      </div>
    </form>
  );
}
