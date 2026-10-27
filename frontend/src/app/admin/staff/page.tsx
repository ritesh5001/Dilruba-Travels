"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { staffRoleLabels, staffRoleNames, staffRoles, type StaffUser } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { Badge, Card, Empty, ErrorBox, Loading, PageHeader, formatDate } from "@/components/admin/ui";

export default function StaffPage() {
  const { data, setData, error, reload } = useAdminData<StaffUser[]>("/staff");
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const action = useAction();

  async function save(body: unknown, id?: number) {
    const saved = await action.run(() => adminFetch<StaffUser>(id ? `/staff/${id}` : "/staff", { method: id ? "PUT" : "POST", body }));
    if (saved && data) {
      setData(id ? data.map((u) => (u.id === id ? saved : u)) : [...data, saved]);
      setEditing(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Give each team member their own login. Every note and change is recorded with their name."
        actions={editing === null && <button type="button" onClick={() => setEditing("new")} className="btn btn-primary !py-2"><Plus className="size-4" aria-hidden /> Add staff</button>}
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
      {editing === "new" && (
        <Card title="New staff login" className="mb-6 max-w-2xl">
          <StaffForm busy={action.busy} onSave={(b) => save(b)} onCancel={() => setEditing(null)} />
        </Card>
      )}
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>Only you can log in right now. Add your team so they can manage leads and bookings.</Empty></div>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {data.map((u) =>
            editing === u.id ? (
              <li key={u.id} className="p-5"><StaffForm initial={u} busy={action.busy} onSave={(b) => save(b, u.id)} onCancel={() => setEditing(null)} /></li>
            ) : (
              <li key={u.id} className={`flex items-center justify-between gap-3 p-4 ${u.active ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <p className="font-medium">{u.name} {!u.active && <Badge color="red">Switched off</Badge>}</p>
                  <p className="truncate text-sm text-muted">{u.email} · {staffRoleNames[u.role]} · {u.lastLoginAt ? `last login ${formatDate(u.lastLoginAt, true)}` : "never logged in"}</p>
                </div>
                <button type="button" onClick={() => setEditing(u.id)} className="btn btn-outline !px-3 !py-1.5 text-sm"><Pencil className="size-4" aria-hidden /> Edit</button>
              </li>
            ),
          )}
        </ul>
      )}
      <p className="mt-4 text-sm text-muted">The main owner login (set on the server) always works and isn&apos;t listed here. Switching someone off signs them out within a minute.</p>
    </>
  );
}

function StaffForm({ initial, busy, onSave, onCancel }: { initial?: StaffUser; busy: boolean; onSave: (body: unknown) => void; onCancel: () => void }) {
  const id = (k: string) => `st-${initial?.id ?? "new"}-${k}`;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({ name: f.get("name"), email: f.get("email"), role: f.get("role"), active: f.get("active") === "on", password: f.get("password") });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor={id("name")} className="label">Name</label>
        <input id={id("name")} name="name" defaultValue={initial?.name} required className="field" />
      </div>
      <div>
        <label htmlFor={id("email")} className="label">Email (their login)</label>
        <input id={id("email")} name="email" type="email" defaultValue={initial?.email} required className="field" />
      </div>
      <div>
        <label htmlFor={id("role")} className="label">Access</label>
        <select id={id("role")} name="role" defaultValue={initial?.role ?? "staff"} className="field appearance-none">
          {staffRoles.map((r) => <option key={r} value={r}>{staffRoleLabels[r]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={id("pw")} className="label">{initial ? "New password (leave empty to keep)" : "Password"}</label>
        <input id={id("pw")} name="password" type="password" autoComplete="new-password" minLength={10} required={!initial} placeholder="At least 10 characters" className="field" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="size-4 accent-[var(--color-brand)]" /> Can log in
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">{busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save</button>
        <button type="button" onClick={onCancel} className="btn btn-outline !py-2">Cancel</button>
      </div>
    </form>
  );
}
