"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { AdminReview, ReviewInput } from "@dilruba/shared/ops";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { Badge, Card, Empty, ErrorBox, Loading, PageHeader } from "@/components/admin/ui";

/** Reviews in the home page carousel. Only published ones show; lower numbers show first. */
export default function ReviewsPage() {
  const { data, setData, error, reload } = useAdminData<AdminReview[]>("/reviews");
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const action = useAction();

  const toBody = (r: AdminReview, patch: Partial<ReviewInput> = {}): ReviewInput => ({
    name: r.name,
    location: r.location ?? "",
    trip: r.trip ?? "",
    rating: r.rating,
    body: r.body,
    published: r.published,
    sortOrder: r.sortOrder,
    ...patch,
  });

  async function save(body: ReviewInput, id?: number) {
    const saved = await action.run(() => adminFetch<AdminReview>(id ? `/reviews/${id}` : "/reviews", { method: id ? "PUT" : "POST", body }));
    if (saved && data) {
      setData(id ? data.map((r) => (r.id === id ? saved : r)) : [saved, ...data]);
      setEditing(null);
    }
  }

  async function remove(r: AdminReview) {
    if (!window.confirm(`Delete the review from ${r.name}?`)) return;
    const ok = await action.run(() => adminFetch(`/reviews/${r.id}`, { method: "DELETE" }));
    if (ok && data) setData(data.filter((x) => x.id !== r.id));
  }

  const shown = data?.filter((r) => r.published).length ?? 0;

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="Customer reviews in the scrolling “Real stories” section on the home page. Only add genuine reviews from real customers."
        actions={editing === null && <button type="button" onClick={() => setEditing("new")} className="btn btn-primary !py-2"><Plus className="size-4" aria-hidden /> Add review</button>}
      />
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}
      {editing === "new" && (
        <Card title="New review" className="mb-6 max-w-3xl">
          <ReviewForm busy={action.busy} onSave={(b) => save(b)} onCancel={() => setEditing(null)} />
        </Card>
      )}
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white">
          <Empty>No reviews yet. Add reviews customers left on Google or WhatsApp, or publish feedback from a completed booking. The section stays hidden on the website until one is shown.</Empty>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">{shown} shown on the website · {data.length - shown} hidden</p>
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.map((r) =>
              editing === r.id ? (
                <li key={r.id} className="rounded-2xl border border-line bg-white p-5 lg:col-span-2">
                  <ReviewForm initial={r} busy={action.busy} onSave={(b) => save(b, r.id)} onCancel={() => setEditing(null)} />
                </li>
              ) : (
                <li key={r.id} className={`flex flex-col rounded-2xl border border-line bg-white p-5 ${r.published ? "" : "opacity-70"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-0.5 text-amber" aria-label={`${r.rating} out of 5`} role="img">
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-4 ${n <= r.rating ? "" : "text-line"}`} fill="currentColor" aria-hidden />)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.fromFeedback && <Badge color="blue">From feedback</Badge>}
                      {r.published ? <Badge color="green">Shown</Badge> : <Badge>Hidden</Badge>}
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-sm italic text-ink/80">“{r.body}”</p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                    <p className="min-w-0 truncate text-sm">
                      <strong className="font-semibold">{r.name}</strong>
                      <span className="text-muted">{[r.location, r.trip].filter(Boolean).length ? ` · ${[r.location, r.trip].filter(Boolean).join(" | ")}` : ""} · order {r.sortOrder}</span>
                    </p>
                    <div className="flex shrink-0 items-center">
                      <button type="button" disabled={action.busy} onClick={() => void save(toBody(r, { published: !r.published }), r.id)} className="rounded-full p-2 text-muted hover:bg-sand hover:text-ink" title={r.published ? "Hide from website" : "Show on website"}>
                        {r.published ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                        <span className="sr-only">{r.published ? "Hide" : "Show"}</span>
                      </button>
                      <button type="button" onClick={() => setEditing(r.id)} className="rounded-full p-2 text-muted hover:bg-sand hover:text-ink" aria-label={`Edit review from ${r.name}`}>
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button type="button" disabled={action.busy} onClick={() => void remove(r)} className="rounded-full p-2 text-muted hover:bg-sand hover:text-brand" aria-label={`Delete review from ${r.name}`}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </>
  );
}

function ReviewForm({ initial, busy, onSave, onCancel }: { initial?: AdminReview; busy: boolean; onSave: (body: ReviewInput) => void; onCancel: () => void }) {
  const id = (k: string) => `rv-${initial?.id ?? "new"}-${k}`;
  const [body, setBody] = useState(initial?.body ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          name: f.get("name") as string,
          location: f.get("location") as string,
          trip: f.get("trip") as string,
          rating: Number(f.get("rating")),
          body,
          published: f.get("published") === "on",
          sortOrder: Number(f.get("sortOrder")) || 0,
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor={id("name")} className="label">Name</label>
        <input id={id("name")} name="name" defaultValue={initial?.name} required maxLength={60} placeholder="e.g. Ayesha K." className="field" />
      </div>
      <div>
        <label htmlFor={id("location")} className="label">City <span className="font-normal text-muted">(optional)</span></label>
        <input id={id("location")} name="location" defaultValue={initial?.location ?? ""} maxLength={60} placeholder="e.g. Mumbai" className="field" />
      </div>
      <div>
        <label htmlFor={id("trip")} className="label">Trip <span className="font-normal text-muted">(optional)</span></label>
        <input id={id("trip")} name="trip" defaultValue={initial?.trip ?? ""} maxLength={80} placeholder="e.g. Ramadan Umrah 2026" className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id("rating")} className="label">Stars</label>
          <select id={id("rating")} name="rating" defaultValue={initial?.rating ?? 5} className="field appearance-none">
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={id("order")} className="label">Order</label>
          <input id={id("order")} name="sortOrder" type="number" min="0" defaultValue={initial?.sortOrder ?? 0} className="field" />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("body")} className="label">Review</label>
        <textarea id={id("body")} value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={600} rows={4} className="field resize-none" placeholder="In the customer's own words" />
        <p className="mt-1 text-right text-xs text-muted">{body.length}/600 · about 250 characters fits the card best</p>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="published" defaultChecked={initial?.published ?? true} className="size-4 accent-[var(--color-brand)]" /> Show on the website
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-primary !py-2 disabled:opacity-50">{busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save</button>
        <button type="button" onClick={onCancel} className="btn btn-outline !py-2">Cancel</button>
      </div>
    </form>
  );
}
