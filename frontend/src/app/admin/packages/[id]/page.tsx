"use client";

import { useParams, useSearchParams } from "next/navigation";
import type { AdminPackage } from "@dilruba/shared/catalog";
import { useAdminData } from "@/lib/admin-api";
import { PackageEditor, draftFromPackage } from "@/components/admin/package-editor";
import { ErrorBox, Loading, PageHeader, formatDate } from "@/components/admin/ui";

export default function EditPackagePage() {
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get("created") === "1";
  const { data: p, error, reload } = useAdminData<AdminPackage>(`/packages/${id}`);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!p) return <Loading />;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/packages", label: "Packages" }}
        title={p.title}
        subtitle={`${p.published ? "Shown on website" : "Hidden"} · last changed ${formatDate(p.updatedAt, true)}`}
      />
      {created && (
        <p role="status" className="mb-4 rounded-xl bg-[#25d366]/10 px-4 py-3 text-sm font-medium text-[#0f7a3a]">
          Package created.{p.published ? "" : " Tick “Show on website” and save when it’s ready."}
        </p>
      )}
      {/* Remount the form with fresh values whenever the saved package changes. */}
      <PackageEditor key={p.updatedAt} initial={draftFromPackage(p)} id={p.id} />
    </>
  );
}
