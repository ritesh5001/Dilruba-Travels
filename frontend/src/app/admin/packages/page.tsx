"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Plus, Star } from "lucide-react";
import { categoryNames, categorySlugs, type AdminPackage, type CategorySlug } from "@dilruba/shared/catalog";
import { adminFetch, useAction, useAdminData } from "@/lib/admin-api";
import { formatPrice } from "@/lib/packages";
import { Empty, ErrorBox, Loading, PageHeader } from "@/components/admin/ui";

export default function PackagesAdminPage() {
  const { data, setData, error, reload } = useAdminData<AdminPackage[]>("/packages");
  const [category, setCategory] = useState<CategorySlug | "">("");
  const action = useAction();

  async function toggle(p: AdminPackage, change: { published?: boolean; featured?: boolean }) {
    const updated = await action.run(() => adminFetch<AdminPackage>(`/packages/${p.id}`, { method: "PATCH", body: change }));
    if (updated && data) setData(data.map((x) => (x.id === updated.id ? updated : x)));
  }

  const shown = (data ?? []).filter((p) => !category || p.category === category);

  return (
    <>
      <PageHeader
        title="Packages"
        subtitle="Everything listed on the website. Changes show on the site after you save."
        actions={
          <Link href={`/admin/packages/new${category ? `?category=${category}` : ""}`} className="btn btn-primary !py-2">
            <Plus className="size-4" aria-hidden /> Add package
          </Link>
        }
      />
      <div className="no-scrollbar -mx-1 mb-4 flex gap-1 overflow-x-auto px-1">
        {(["", ...categorySlugs] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              category === c ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-line hover:text-ink"
            }`}
          >
            {c ? categoryNames[c] : "All"}
            {data && <span className="ml-1.5 opacity-60">{c ? data.filter((p) => p.category === c).length : data.length}</span>}
          </button>
        ))}
      </div>
      {action.error && <div className="mb-4"><ErrorBox message={action.error} /></div>}

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white"><Empty>No packages here yet.</Empty></div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {shown.map((p) => (
            <li key={p.id} className={`flex items-center gap-4 p-3 sm:p-4 ${p.published ? "" : "bg-sand/60"}`}>
              <Link href={`/admin/packages/${p.id}`} className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-sand sm:w-28">
                <Image src={p.image} alt="" fill sizes="112px" className={`object-cover ${p.published ? "" : "opacity-50 grayscale"}`} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/packages/${p.id}`} className="font-medium hover:text-brand">{p.title}</Link>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {categoryNames[p.category]} · {p.days}D/{p.nights}N · {formatPrice(p.startingPrice) ?? "Price on request"}
                  {!p.published && " · Hidden"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void toggle(p, { featured: !p.featured })}
                  disabled={action.busy}
                  aria-pressed={!!p.featured}
                  title={p.featured ? "Featured on home page (click to remove)" : "Feature on home page"}
                  className={`rounded-full p-2 hover:bg-sand ${p.featured ? "text-gold" : "text-muted"}`}
                >
                  <Star className="size-4" fill={p.featured ? "currentColor" : "none"} aria-hidden />
                  <span className="sr-only">Featured</span>
                </button>
                <button
                  type="button"
                  onClick={() => void toggle(p, { published: !p.published })}
                  disabled={action.busy}
                  aria-pressed={p.published}
                  title={p.published ? "Shown on website (click to hide)" : "Hidden (click to show)"}
                  className={`rounded-full p-2 hover:bg-sand ${p.published ? "text-[#0f7a3a]" : "text-muted"}`}
                >
                  {p.published ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                  <span className="sr-only">{p.published ? "Shown" : "Hidden"}</span>
                </button>
                <Link href={`/admin/packages/${p.id}`} className="btn btn-outline ml-1 !px-3 !py-1.5 text-sm">Edit</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
