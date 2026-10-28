import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PackageCard } from "@/components/package-card";
import { CtaBand } from "@/components/cta-band";
import { WhatsAppIcon } from "@/components/icons";
import { getPackages } from "@/lib/catalog";
import { collectionPackages, collections, getCollection } from "@/lib/collections";
import { photo } from "@/lib/images";
import { getCategory } from "@/lib/packages";
import { whatsappLink } from "@/lib/site";

export function generateStaticParams() {
  return collections.map((c) => ({ collection: c.slug }));
}

export async function generateMetadata(props: PageProps<"/tours/[collection]">): Promise<Metadata> {
  const { collection } = await props.params;
  const c = getCollection(collection);
  if (!c) return {};
  return { title: `${c.title} from Mumbai`, description: c.intro, alternates: { canonical: `/tours/${c.slug}` }, openGraph: { images: [photo(c.image, 1200)] } };
}

/** A group of packages, e.g. every Economy fixed-departure Umrah. Each card opens its package. */
export default async function CollectionPage(props: PageProps<"/tours/[collection]">) {
  const { collection } = await props.params;
  const c = getCollection(collection);
  const category = c && getCategory(c.category);
  if (!c || !category) notFound();
  const items = collectionPackages(c, await getPackages());

  return (
    <>
      <PageHero
        image={photo(c.image, 2400)}
        eyebrow={category.shortName}
        title={c.title}
        subtitle={c.intro}
        crumbs={[
          { href: "/", label: "Home" },
          { href: `/packages/${category.slug}`, label: category.shortName },
          { label: c.menuLabel },
        ]}
      />

      <section className="container-x py-14 sm:py-20">
        {items.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-[1.75rem] bg-sand p-8 text-center">
            <p className="text-xl font-semibold">New dates are being planned</p>
            <p className="mt-2 text-muted">Tell us when you&apos;d like to travel and we&apos;ll share the next group, or build a package around your dates.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={`/custom-package?trip=${encodeURIComponent(category.shortName)}`} className="btn btn-primary">
                <Sparkles className="size-4" aria-hidden /> Build a custom package
              </Link>
              <a href={whatsappLink(`Assalamu Alaikum, please share the next ${c.title} dates.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
                <WhatsAppIcon className="size-4" /> Ask on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">
              {items.length} {items.length === 1 ? "package" : "packages"} · Departures from Mumbai · Tap a package for hotels, itinerary and dates
            </p>
            <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((p) => (
                <PackageCard key={p.slug} pkg={p} />
              ))}
            </div>
          </>
        )}
        <p className="mt-12 text-sm">
          <Link href={`/packages/${category.slug}`} className="font-medium text-brand hover:underline">
            See all {category.name}
          </Link>
        </p>
      </section>

      <div className="pb-10 sm:pb-14">
        <CtaBand source={`${c.title} page`} />
      </div>
    </>
  );
}
