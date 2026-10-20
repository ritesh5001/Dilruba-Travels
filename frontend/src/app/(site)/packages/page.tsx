import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PackageCard } from "@/components/package-card";
import { SectionHeading } from "@/components/section-heading";
import { CtaBand } from "@/components/cta-band";
import { photo } from "@/lib/images";
import { categories, getPackagesByCategory } from "@/lib/packages";

export const metadata: Metadata = {
  title: "All Packages – Umrah, Hajj, Ziyarat & Holidays",
  description:
    "Browse Umrah, Hajj, Iraq, Jordan, Palestine and Turkey packages, plus Asia and India holidays from Mumbai.",
  alternates: { canonical: "/packages" },
};

export default function PackagesPage() {
  return (
    <>
      <PageHero
        image={photo("kaaba", 2400)}
        eyebrow="All packages"
        title="Find the journey that's right for you"
        subtitle="Pilgrimage, ziyarat and holiday packages from Mumbai. Every package can be customised to your dates and budget."
        crumbs={[{ href: "/", label: "Home" }, { label: "Packages" }]}
      >
        <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <a
              key={c.slug}
              href={`#${c.slug}`}
              className="shrink-0 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white hover:text-ink"
            >
              {c.shortName}
            </a>
          ))}
        </div>
      </PageHero>

      <div className="container-x space-y-20 py-14 sm:py-20">
        {categories.map((c) => {
          const items = getPackagesByCategory(c.slug);
          return (
            <section key={c.slug} id={c.slug} className="scroll-mt-24">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <SectionHeading strong={c.shortName} soft={c.group === "main" ? "packages" : "holidays"} intro={c.tagline} />
                <Link href={`/packages/${c.slug}`} className="btn btn-outline shrink-0 self-start sm:self-auto">
                  View {c.name} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((p) => (
                  <PackageCard key={p.slug} pkg={p} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="pb-10 sm:pb-14">
        <CtaBand source="Packages page" />
      </div>
    </>
  );
}
