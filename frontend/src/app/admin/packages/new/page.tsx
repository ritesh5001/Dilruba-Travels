"use client";

import { useSearchParams } from "next/navigation";
import { categorySlugs, type CategorySlug } from "@dilruba/shared/catalog";
import { PackageEditor, blankDraft } from "@/components/admin/package-editor";
import { PageHeader } from "@/components/admin/ui";

export default function NewPackagePage() {
  const params = useSearchParams();
  const requested = params.get("category");
  const category = (categorySlugs as readonly string[]).includes(requested ?? "") ? (requested as CategorySlug) : "umrah";

  return (
    <>
      <PageHeader back={{ href: "/admin/packages", label: "Packages" }} title="New package" subtitle="It stays hidden until you tick “Show on website”." />
      <PackageEditor initial={blankDraft(category)} />
    </>
  );
}
