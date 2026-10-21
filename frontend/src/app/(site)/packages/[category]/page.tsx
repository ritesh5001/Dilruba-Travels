import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { PackageCard } from "@/components/package-card";
import { CtaBand } from "@/components/cta-band";
import { photo } from "@/lib/images";
import { getPackagesByCategory } from "@/lib/catalog";
import { categories, getCategory } from "@/lib/packages";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/icons";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(props: PageProps<"/packages/[category]">): Promise<Metadata> {
  const { category } = await props.params;
  const c = getCategory(category);
  if (!c) return {};
  return {
    title: c.seoTitle,
    description: c.seoDescription,
    alternates: { canonical: `/packages/${c.slug}` },
    openGraph: { images: [photo(c.image, 1200)] },
  };
}

export default async function CategoryPage(props: PageProps<"/packages/[category]">) {
  const { category } = await props.params;
  const c = getCategory(category);
  if (!c) notFound();

  const items = await getPackagesByCategory(c.slug);
  const others = categories.filter((o) => o.slug !== c.slug);

  return (
    <>
      <PageHero
        image={photo(c.image, 2400)}
        eyebrow={c.group === "main" ? "Main packages" : "Holidays"}
        title={c.name}
        subtitle={c.description}
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/packages", label: "Packages" },
          { label: c.shortName },
        ]}
      >
        <a
          href={whatsappLink(`Assalamu Alaikum, please share your latest ${c.name} with prices and dates.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp mt-8"
        >
          <WhatsAppIcon className="size-4" /> Get today&apos;s {c.shortName} prices
        </a>
      </PageHero>

      <section className="container-x py-14 sm:py-20">
        <p className="text-sm text-muted">
          {items.length} {items.length === 1 ? "package" : "packages"} · All departures from Mumbai · Customisable
          dates
        </p>
        <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <PackageCard key={p.slug} pkg={p} />
          ))}
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-semibold">Explore other packages</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/packages/${o.slug}`}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink"
              >
                {o.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="pb-10 sm:pb-14">
        <CtaBand source={`${c.name} page`} />
      </div>
    </>
  );
}
