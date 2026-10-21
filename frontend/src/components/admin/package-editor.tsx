"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  categoryNames,
  categorySlugs,
  packageInputSchema,
  packageTiers,
  slugify,
  type AdminPackage,
  type CategorySlug,
  type PackageInput,
} from "@dilruba/shared/catalog";
import { adminFetch, clearAdminCache, useAction } from "@/lib/admin-api";
import { ImagePicker } from "./image-picker";
import { Card, ErrorBox } from "./ui";

type Hotel = { city: string; detail: string };
type Day = { day: string; title: string; description: string };
type Faq = { q: string; a: string };

/** Form state: free-text lists are edited as one item per line. */
export type Draft = {
  category: CategorySlug;
  title: string;
  slug: string;
  summary: string;
  days: string;
  nights: string;
  tier: string;
  startingPrice: string;
  sharing: string;
  routeFrom: string;
  routeTo: string;
  places: string;
  image: string;
  gallery: string[];
  featured: boolean;
  published: boolean;
  sortOrder: string;
  highlights: string;
  inclusions: string;
  exclusions: string;
  documents: string;
  hotels: Hotel[];
  itinerary: Day[];
  faqs: Faq[];
};

export function blankDraft(category: CategorySlug): Draft {
  return {
    category,
    title: "",
    slug: "",
    summary: "",
    days: "15",
    nights: "14",
    tier: "",
    startingPrice: "",
    sharing: "",
    routeFrom: "Mumbai",
    routeTo: "",
    places: "",
    image: "",
    gallery: [],
    featured: false,
    published: false,
    sortOrder: "500",
    highlights: "",
    inclusions: "",
    exclusions: "",
    documents: "",
    hotels: [],
    itinerary: [{ day: "Day 1", title: "", description: "" }],
    faqs: [],
  };
}

export function draftFromPackage(p: AdminPackage): Draft {
  const lines = (list: string[] | undefined) => (list ?? []).join("\n");
  return {
    category: p.category,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    days: String(p.days),
    nights: String(p.nights),
    tier: p.tier ?? "",
    startingPrice: p.startingPrice === null ? "" : String(p.startingPrice),
    sharing: p.sharing ?? "",
    routeFrom: p.route[0],
    routeTo: p.route[1],
    places: lines(p.places),
    image: p.image,
    gallery: p.gallery ?? [],
    featured: !!p.featured,
    published: p.published,
    sortOrder: String(p.sortOrder),
    highlights: lines(p.highlights),
    inclusions: lines(p.inclusions),
    exclusions: lines(p.exclusions),
    documents: lines(p.documents),
    hotels: p.hotels ?? [],
    itinerary: p.itinerary,
    faqs: p.faqs ?? [],
  };
}

const splitLines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);
const isBlankRow = (row: Record<string, string>) => Object.values(row).every((v) => !v.trim());

function toInput(d: Draft) {
  return {
    category: d.category,
    title: d.title,
    slug: d.slug,
    summary: d.summary,
    days: d.days,
    nights: d.nights,
    tier: d.tier || null,
    startingPrice: d.startingPrice.trim() === "" ? null : d.startingPrice.replace(/[,\s₹]/g, ""),
    sharing: d.sharing || null,
    routeFrom: d.routeFrom,
    routeTo: d.routeTo,
    places: splitLines(d.places.replace(/,/g, "\n")),
    image: d.image,
    gallery: d.gallery,
    featured: d.featured,
    published: d.published,
    sortOrder: d.sortOrder,
    highlights: splitLines(d.highlights),
    inclusions: splitLines(d.inclusions),
    exclusions: splitLines(d.exclusions),
    documents: splitLines(d.documents),
    // Ignore rows left completely empty.
    hotels: d.hotels.filter((h) => !isBlankRow(h)),
    itinerary: d.itinerary.filter((r) => !isBlankRow(r)),
    faqs: d.faqs.filter((f) => !isBlankRow(f)),
  };
}

const fieldLabels: Record<string, string> = {
  routeFrom: "Route from",
  routeTo: "Route to",
  startingPrice: "Starting price",
  sortOrder: "Display order",
  image: "Cover image",
};

function describeIssue(issue: { path: PropertyKey[]; message: string }) {
  const [field, index, sub] = issue.path;
  const name = fieldLabels[String(field)] ?? String(field).replace(/^./, (c) => c.toUpperCase());
  const where = typeof index === "number" ? ` (row ${index + 1}${sub ? `, ${String(sub)}` : ""})` : "";
  return `${name}${where}: ${issue.message}`;
}

export function PackageEditor({ initial, id }: { initial: Draft; id?: number }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(initial);
  const [slugTouched, setSlugTouched] = useState(!!id);
  const [picker, setPicker] = useState<null | "cover" | "gallery">(null);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSaved(false);
    setD((prev) => ({ ...prev, [key]: value }));
  };

  async function save() {
    const parsed = packageInputSchema.safeParse(toInput(d));
    if (!parsed.success) {
      action.setError(describeIssue(parsed.error.issues[0]));
      return;
    }
    const body: PackageInput = parsed.data;
    const result = await action.run(() =>
      adminFetch<AdminPackage>(id ? `/packages/${id}` : "/packages", { method: id ? "PUT" : "POST", body }),
    );
    if (!result) return;
    clearAdminCache();
    if (!id) {
      router.replace(`/admin/packages/${result.id}?created=1`);
      return;
    }
    setD(draftFromPackage(result));
    setSaved(true);
  }

  async function remove() {
    if (!id || !confirm(`Delete “${d.title}” for good? It disappears from the website. Bookings that mention it are kept.`)) return;
    const ok = await action.run(() => adminFetch(`/packages/${id}`, { method: "DELETE" }));
    if (ok) {
      clearAdminCache();
      router.replace("/admin/packages");
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-6 pb-24"
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Text label="Title" value={d.title} onChange={(v) => {
                set("title", v);
                if (!slugTouched) set("slug", slugify(v));
              }} className="sm:col-span-2" placeholder="e.g. Ramadan Umrah – 20 Days" />
              <div>
                <label htmlFor="pk-category" className="label">Category</label>
                <select id="pk-category" value={d.category} onChange={(e) => set("category", e.target.value as CategorySlug)} className="field appearance-none">
                  {categorySlugs.map((c) => <option key={c} value={c}>{categoryNames[c]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pk-slug" className="label">URL slug</label>
                <input
                  id="pk-slug"
                  value={d.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                  className="field"
                />
                <p className="mt-1 truncate text-xs text-muted">/packages/{d.category}/{d.slug || "…"}</p>
              </div>
              <Area label="Summary" value={d.summary} onChange={(v) => set("summary", v)} rows={2} className="sm:col-span-2" hint="One or two sentences shown on cards and at the top of the page." />
              <Text label="Days" type="number" value={d.days} onChange={(v) => set("days", v)} />
              <Text label="Nights" type="number" value={d.nights} onChange={(v) => set("nights", v)} />
              <Text label="Starting price (₹ per person)" type="number" value={d.startingPrice} onChange={(v) => set("startingPrice", v)} hint="Leave empty to show “Best price on request”." />
              <div>
                <label htmlFor="pk-tier" className="label">Tier</label>
                <select id="pk-tier" value={d.tier} onChange={(e) => set("tier", e.target.value)} className="field appearance-none">
                  <option value="">None</option>
                  {packageTiers.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Text label="Room sharing" value={d.sharing} onChange={(v) => set("sharing", v)} placeholder="e.g. Quad / Triple / Double" />
              <Area label="Places covered" value={d.places} onChange={(v) => set("places", v)} rows={2} hint="One per line (or comma separated)." />
              <Text label="Route from" value={d.routeFrom} onChange={(v) => set("routeFrom", v)} />
              <Text label="Route to" value={d.routeTo} onChange={(v) => set("routeTo", v)} placeholder="e.g. Makkah" />
            </div>
          </Card>

          <Card title="Photos">
            <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
              <div>
                <p className="label">Cover image</p>
                <button type="button" onClick={() => setPicker("cover")} className="relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-sand ring-1 ring-line">
                  {d.image ? (
                    <Image src={d.image} alt="" fill sizes="220px" className="object-cover" />
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted"><ImagePlus className="size-6" aria-hidden /> Choose cover</span>
                  )}
                </button>
                {d.image && <button type="button" onClick={() => setPicker("cover")} className="mt-2 text-sm font-medium text-brand">Change cover</button>}
              </div>
              <div>
                <p className="label">Gallery <span className="font-normal text-muted">(shown on the package page)</span></p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {d.gallery.map((url, i) => (
                    <div key={`${url}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-line">
                      <Image src={url} alt="" fill sizes="140px" className="object-cover" />
                      <div className="absolute inset-x-1 top-1 flex justify-between opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => set("gallery", move(d.gallery, i, -1))} className="rounded-full bg-white/90 p-1 disabled:opacity-30"><ArrowUp className="size-3.5 -rotate-90" aria-hidden /></button>
                        <button type="button" aria-label="Remove from gallery" onClick={() => set("gallery", d.gallery.filter((_, j) => j !== i))} className="rounded-full bg-white/90 p-1 text-brand"><X className="size-3.5" aria-hidden /></button>
                      </div>
                    </div>
                  ))}
                  {d.gallery.length < 12 && (
                    <button type="button" onClick={() => setPicker("gallery")} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-muted hover:border-ink hover:text-ink">
                      <Plus className="size-5" aria-hidden /> Add photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card title="What's included">
            <div className="grid gap-4 sm:grid-cols-2">
              <Area label="Highlights" value={d.highlights} onChange={(v) => set("highlights", v)} rows={5} hint="One per line." className="sm:col-span-2" />
              <Area label="Inclusions" value={d.inclusions} onChange={(v) => set("inclusions", v)} rows={6} hint="One per line." />
              <Area label="Exclusions" value={d.exclusions} onChange={(v) => set("exclusions", v)} rows={6} hint="One per line." />
              <Area label="Documents required" value={d.documents} onChange={(v) => set("documents", v)} rows={4} hint="One per line." className="sm:col-span-2" />
            </div>
          </Card>

          <Rows
            title="Hotels"
            rows={d.hotels}
            onChange={(rows) => set("hotels", rows)}
            blank={{ city: "", detail: "" }}
            addLabel="Add hotel"
            render={(row, update) => (
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <Text label="City" value={row.city} onChange={(v) => update({ ...row, city: v })} />
                <Text label="Hotel details" value={row.detail} onChange={(v) => update({ ...row, detail: v })} placeholder="e.g. 4★ hotel, approx. 300 m from Haram" />
              </div>
            )}
          />

          <Rows
            title="Itinerary"
            rows={d.itinerary}
            onChange={(rows) => set("itinerary", rows)}
            blank={{ day: `Day ${d.itinerary.length + 1}`, title: "", description: "" }}
            addLabel="Add day"
            render={(row, update) => (
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <Text label="Day" value={row.day} onChange={(v) => update({ ...row, day: v })} placeholder="Day 2–8" />
                <Text label="Title" value={row.title} onChange={(v) => update({ ...row, title: v })} placeholder="Makkah" />
                <Area label="Description" value={row.description} onChange={(v) => update({ ...row, description: v })} rows={2} className="sm:col-span-2" />
              </div>
            )}
          />

          <Rows
            title="FAQs"
            rows={d.faqs}
            onChange={(rows) => set("faqs", rows)}
            blank={{ q: "", a: "" }}
            addLabel="Add question"
            render={(row, update) => (
              <div className="grid gap-3">
                <Text label="Question" value={row.q} onChange={(v) => update({ ...row, q: v })} />
                <Area label="Answer" value={row.a} onChange={(v) => update({ ...row, a: v })} rows={2} />
              </div>
            )}
          />
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card title="Visibility">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={d.published} onChange={(e) => set("published", e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
              <span><span className="font-medium">Show on website</span><br /><span className="text-muted">Untick to hide it without deleting.</span></span>
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
              <span><span className="font-medium">Feature on the home page</span><br /><span className="text-muted">Appears in “Popular packages”.</span></span>
            </label>
            <div className="mt-4">
              <Text label="Display order" type="number" value={d.sortOrder} onChange={(v) => set("sortOrder", v)} hint="Lower numbers show first." />
            </div>
          </Card>
          {id && d.published && (
            <Link href={`/packages/${initial.category}/${initial.slug}`} target="_blank" className="btn btn-outline w-full">
              <ExternalLink className="size-4" aria-hidden /> View on website
            </Link>
          )}
          {id && (
            <button type="button" onClick={() => void remove()} disabled={action.busy} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand">
              <Trash2 className="size-4" aria-hidden /> Delete package
            </button>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:left-60">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {action.error && <div className="mr-auto min-w-0 flex-1"><ErrorBox message={action.error} /></div>}
          {saved && !action.error && <p role="status" className="mr-auto text-sm font-medium text-[#0f7a3a]">Saved.</p>}
          <Link href="/admin/packages" className="btn btn-outline !py-2">Back</Link>
          <button type="submit" disabled={action.busy} className="btn btn-primary !py-2 disabled:opacity-60">
            {action.busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {id ? "Save changes" : "Create package"}
          </button>
        </div>
      </div>

      <ImagePicker
        open={picker !== null}
        title={picker === "cover" ? "Choose the cover image" : "Add a gallery photo"}
        onClose={() => setPicker(null)}
        onSelect={(url) => (picker === "cover" ? set("image", url) : set("gallery", [...d.gallery, url]))}
      />
    </form>
  );
}

function move<T>(list: T[], index: number, by: number) {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(index + by, 0, item);
  return next;
}

function Text({ label, value, onChange, type = "text", placeholder, hint, className = "" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <input type={type} inputMode={type === "number" ? "numeric" : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field" />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Area({ label, value, onChange, rows = 3, hint, className = "" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="field resize-y" />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Rows<T extends Record<string, string>>({ title, rows, onChange, blank, addLabel, render }: {
  title: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  blank: T;
  addLabel: string;
  render: (row: T, update: (row: T) => void) => React.ReactNode;
}) {
  return (
    <Card title={title}>
      <ol className="space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="rounded-xl border border-line p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">#{i + 1}</span>
              <div className="flex gap-1">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => onChange(move(rows, i, -1))} className="rounded p-1 text-muted hover:text-ink disabled:opacity-30"><ArrowUp className="size-4" aria-hidden /></button>
                <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => onChange(move(rows, i, 1))} className="rounded p-1 text-muted hover:text-ink disabled:opacity-30"><ArrowDown className="size-4" aria-hidden /></button>
                <button type="button" aria-label="Remove" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="rounded p-1 text-muted hover:text-brand"><Trash2 className="size-4" aria-hidden /></button>
              </div>
            </div>
            {render(row, (next) => onChange(rows.map((r, j) => (j === i ? next : r))))}
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => onChange([...rows, blank])} className="btn btn-outline mt-3 !py-2">
        <Plus className="size-4" aria-hidden /> {addLabel}
      </button>
    </Card>
  );
}
