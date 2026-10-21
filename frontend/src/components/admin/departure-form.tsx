"use client";

import { Loader2 } from "lucide-react";
import type { AdminPackage } from "@dilruba/shared/catalog";
import type { AdminDeparture } from "@dilruba/shared/ops";
import { useAdminData } from "@/lib/admin-api";

/** Create or edit a group departure: package, dates, seats. */
export function DepartureForm({ initial, busy, onSave, onCancel }: { initial?: AdminDeparture; busy: boolean; onSave: (body: unknown) => void; onCancel?: () => void }) {
  const { data: packages } = useAdminData<AdminPackage[]>("/packages");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          packageId: f.get("packageId") ? Number(f.get("packageId")) : null,
          title: f.get("title"),
          startDate: f.get("startDate"),
          endDate: f.get("endDate"),
          seats: Number(f.get("seats")),
          status: f.get("status"),
          notes: f.get("notes"),
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor="dep-title" className="label">Name</label>
        <input id="dep-title" name="title" defaultValue={initial?.title ?? ""} required placeholder="e.g. Ramadan Umrah group A" className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="dep-package" className="label">Package</label>
        <select id="dep-package" name="packageId" defaultValue={initial?.packageId ?? ""} className="field appearance-none">
          <option value="">Not linked to a package</option>
          {packages?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <p className="mt-1 text-xs text-muted">Linked, open departures show on that package&apos;s page with seats left, and customers can pick them when booking.</p>
      </div>
      <div>
        <label htmlFor="dep-start" className="label">Departs</label>
        <input id="dep-start" name="startDate" type="date" defaultValue={initial?.startDate ?? ""} required className="field" />
      </div>
      <div>
        <label htmlFor="dep-end" className="label">Returns</label>
        <input id="dep-end" name="endDate" type="date" defaultValue={initial?.endDate ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="dep-seats" className="label">Seats</label>
        <input id="dep-seats" name="seats" type="number" min="1" max="1000" defaultValue={initial?.seats ?? 40} required className="field" />
      </div>
      <div>
        <label htmlFor="dep-status" className="label">Bookings</label>
        <select id="dep-status" name="status" defaultValue={initial?.status ?? "open"} className="field appearance-none">
          <option value="open">Open</option>
          <option value="closed">Closed (hidden from the website)</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="dep-notes" className="label">Notes <span className="font-normal text-muted">(staff only)</span></label>
        <textarea id="dep-notes" name="notes" rows={2} defaultValue={initial?.notes ?? ""} placeholder="Flight numbers, hotel block, group leader…" className="field resize-none" />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {initial ? "Save" : "Add departure"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="btn btn-outline !py-2">Cancel</button>}
      </div>
    </form>
  );
}
