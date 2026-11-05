"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { hotelCities, hotelCityLabels, type AdminHotel, type HotelCity } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { Card, Empty, ErrorBox, Loading, PageHeader } from "@/components/admin/ui";

/** Makkah and Madinah hotels the team picks from when writing a quote. */
export default function HotelsPage() {
  const { data, setData, error, reload } = useAdminData<AdminHotel[]>("/hotels");
  const action = useAction();
  const [editing, setEditing] = useState<number | null>(null);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  async function save(body: { city: HotelCity; name: string; detail: string }, id?: number) {
    const saved = await action.run(() => adminFetch<AdminHotel>(id ? `/hotels/${id}` : "/hotels", { method: id ? "PUT" : "POST", body }));
    if (saved && data) setData(id ? data.map((h) => (h.id === id ? saved : h)) : [...data, saved]);
    if (saved) setEditing(null);
    return !!saved;
  }

  function remove(h: AdminHotel) {
    if (!window.confirm(`Delete ${h.name}? Quotes already written with it keep showing it.`)) return;
    void action.run(async () => {
      await adminFetch(`/hotels/${h.id}`, { method: "DELETE" });
      setData(data!.filter((x) => x.id !== h.id));
    });
  }

  return (
    <>
      <PageHeader title="Hotels" subtitle="The Makkah and Madinah hotels you offer. Pick them from a dropdown when writing a quote; they show on the quote and its PDF." />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {hotelCities.map((city) => {
          const list = data.filter((h) => h.city === city);
          return (
            <Card key={city} title={`${hotelCityLabels[city]} hotels`}>
              {list.length === 0 ? (
                <Empty>No {hotelCityLabels[city]} hotels yet.</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {list.map((h) =>
                    editing === h.id ? (
                      <li key={h.id} className="py-3">
                        <HotelForm city={city} initial={h} busy={action.busy} onSave={(body) => save(body, h.id)} onCancel={() => setEditing(null)} />
                      </li>
                    ) : (
                      <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-medium">{h.name}</p>
                          {h.detail && <p className="text-sm text-muted">{h.detail}</p>}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => setEditing(h.id)} aria-label={`Edit ${h.name}`} className="rounded-md p-2 text-muted hover:bg-sand hover:text-ink">
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button type="button" disabled={action.busy} onClick={() => remove(h)} aria-label={`Delete ${h.name}`} className="rounded-md p-2 text-muted hover:bg-sand hover:text-brand disabled:opacity-50">
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              )}
              <div className="mt-4 border-t border-line pt-4">
                <HotelForm key={list.length} city={city} busy={action.busy} onSave={(body) => save(body)} />
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function HotelForm({
  city,
  initial,
  busy,
  onSave,
  onCancel,
}: {
  city: HotelCity;
  initial?: AdminHotel;
  busy: boolean;
  onSave: (body: { city: HotelCity; name: string; detail: string }) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const id = (k: string) => `h-${initial?.id ?? `new-${city}`}-${k}`;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        if (await onSave({ city, name: String(f.get("name")), detail: String(f.get("detail")) })) form.reset();
      }}
      className="grid gap-3"
    >
      <div>
        <label htmlFor={id("name")} className="label">{initial ? "Hotel name" : `Add a ${hotelCityLabels[city]} hotel`}</label>
        <input id={id("name")} name="name" defaultValue={initial?.name} required minLength={2} maxLength={120} placeholder={city === "makkah" ? "e.g. Sarayat Al Talayie" : "e.g. Safa Al Barakha"} className="field" />
      </div>
      <div>
        <label htmlFor={id("detail")} className="label">Distance / details <span className="font-normal text-muted">(optional)</span></label>
        <input id={id("detail")} name="detail" defaultValue={initial?.detail ?? ""} maxLength={200} placeholder={city === "makkah" ? "1.5 km from the Haram · 24 hrs free shuttle" : "650 m · easy walking distance"} className="field" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : !initial && <Plus className="size-4" aria-hidden />} {initial ? "Save" : "Add hotel"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="btn btn-outline !py-2">Cancel</button>}
      </div>
    </form>
  );
}
