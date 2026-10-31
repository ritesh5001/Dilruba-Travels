import { roomTypes, roomTypeLabels } from "@dilruba/shared/ops";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  Check,
  FileText,
  MapPin,
  Phone,
  PlaneTakeoff,
  Users,
  X,
} from "lucide-react";
import { formatDay } from "@dilruba/shared/ops";
import { PageHero } from "@/components/page-hero";
import { PackageCard } from "@/components/package-card";
import { SmartImage } from "@/components/smart-image";
import { FaqList } from "@/components/faq-list";
import { EnquiryForm } from "@/components/enquiry-form";
import { JsonLd } from "@/components/json-ld";
import { WhatsAppIcon } from "@/components/icons";
import { getPackage, getPackagesByCategory, packageParams } from "@/lib/catalog";
import { faqJsonLd } from "@/lib/faqs";
import {
  formatPrice,
  getCategory,
  packageHref,
  packageWhatsappMessage,
  serviceFor,
} from "@/lib/packages";
import { site, whatsappLink } from "@/lib/site";

export async function generateStaticParams() {
  return packageParams();
}

export async function generateMetadata(props: PageProps<"/packages/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await props.params;
  const p = await getPackage(category, slug);
  if (!p) return {};
  return {
    title: `${p.title} from Mumbai`,
    description: `${p.summary} ${p.days} days covering ${p.places.join(", ")}. Get today's best price on WhatsApp.`,
    alternates: { canonical: packageHref(p) },
    openGraph: { images: [p.image] },
  };
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-10">
      <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function PackagePage(props: PageProps<"/packages/[category]/[slug]">) {
  const { category, slug } = await props.params;
  const p = await getPackage(category, slug);
  const c = getCategory(category);
  if (!p || !c) notFound();

  const price = formatPrice(p.startingPrice);
  const waLink = whatsappLink(packageWhatsappMessage(p));
  const related = (await getPackagesByCategory(p.category)).filter((r) => r.slug !== p.slug).slice(0, 4);

  const facts = [
    { icon: CalendarDays, label: "Duration", value: `${p.days} Days / ${p.nights} Nights` },
    { icon: PlaneTakeoff, label: "Departure", value: p.route[0] },
    { icon: MapPin, label: "Covers", value: p.places.join(" · ") },
    ...(p.sharing ? [{ icon: Users, label: "Sharing", value: p.sharing }] : []),
  ];

  const productLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: p.title,
    description: p.summary,
    touristType: c.name,
    itinerary: {
      "@type": "ItemList",
      itemListElement: p.places.map((place, i) => ({ "@type": "ListItem", position: i + 1, name: place })),
    },
    provider: { "@type": "TravelAgency", name: site.legalName, telephone: site.phone },
    ...(p.startingPrice
      ? { offers: { "@type": "Offer", price: p.startingPrice, priceCurrency: "INR" } }
      : {}),
  };

  return (
    <>
      <JsonLd data={productLd} />
      {p.faqs && <JsonLd data={faqJsonLd(p.faqs)} />}

      <PageHero
        image={p.image}
        eyebrow={p.tier ? `${p.tier} · ${c.shortName}` : c.shortName}
        title={p.title}
        subtitle={p.summary}
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/packages", label: "Packages" },
          { href: `/packages/${c.slug}`, label: c.shortName },
          { label: p.title },
        ]}
      />

      <div className="container-x grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_380px]">
        {/* Booking card: first on mobile, sticky sidebar on desktop */}
        <aside className="lg:order-2">
          <div className="rounded-[1.75rem] border border-line bg-white p-6 shadow-xl shadow-black/5 lg:sticky lg:top-24">
            <p className="text-sm text-muted">{price ? "Starting from" : "Price"}</p>
            {price ? (
              <p className="mt-1 font-display text-4xl font-semibold text-ink">
                {price}
                <span className="text-base font-normal text-muted"> / person</span>
              </p>
            ) : (
              <p className="mt-1 font-display text-2xl font-semibold text-ink">Best price on request</p>
            )}
            <p className="mt-2 text-sm text-muted">
              Prices change with dates and hotel availability. Message us for today&apos;s best price.
            </p>
            <div className="mt-4 grid gap-2 border-t border-line pt-4">
              {roomTypes.map((room) => <p key={room} className="flex justify-between gap-3 text-sm"><span>{roomTypeLabels[room]}</span><strong>{p.roomPrices?.[room] != null ? `${formatPrice(p.roomPrices[room]!)} / person` : "On request"}</strong></p>)}
            </div>
            {p.departures && p.departures.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-sm font-semibold">Upcoming group dates</p>
                <ul className="mt-2 space-y-2">
                  {p.departures.slice(0, 4).map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        <CalendarDays className="mr-1.5 inline size-4 text-brand" aria-hidden />
                        {formatDay(d.startDate)}
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.seatsLeft === 0 ? "bg-ink/5 text-muted" : d.seatsLeft <= 5 ? "bg-brand/10 text-brand" : "bg-[#25d366]/15 text-[#0f7a3a]"}`}>
                        {d.seatsLeft === 0 ? "Full" : d.seatsLeft <= 5 ? `Only ${d.seatsLeft} left` : `${d.seatsLeft} seats left`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 grid gap-3">
              <Link href={`/book/${p.category}/${p.slug}`} className="btn btn-primary">
                Book this package
              </Link>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
                <WhatsAppIcon className="size-4" /> Get Quote on WhatsApp
              </a>
              <a href={site.phoneHref} className="btn btn-outline">
                <Phone className="size-4" aria-hidden /> Call {site.phone}
              </a>
              <a href="#enquire-package" className="btn btn-outline">
                Send an enquiry
              </a>
            </div>
            <ul className="mt-6 space-y-2 border-t border-line pt-5 text-sm text-muted">
              <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> No payment until you accept the price</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> Customisable dates and hotels</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> Group and family discounts</li>
            </ul>
          </div>
        </aside>

        <div className="space-y-10 lg:order-1">
          {/* Quick facts */}
          <ul className="grid gap-3 sm:grid-cols-2">
            {facts.map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex items-center gap-4 rounded-3xl bg-sand p-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
                  <p className="font-semibold text-ink">{value}</p>
                </div>
              </li>
            ))}
          </ul>

          <Block title="Highlights">
            <ul className="grid gap-3 sm:grid-cols-2">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-3">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber/20 text-gold">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </Block>

          {p.hotels && (
            <Block title="Hotels">
              <ul className="grid gap-4 sm:grid-cols-2">
                {p.hotels.map((h) => (
                  <li key={h.city} className="rounded-3xl border border-line p-5">
                    <p className="flex items-center gap-2 font-semibold">
                      <BedDouble className="size-5 text-brand" aria-hidden /> {h.city}
                    </p>
                    <p className="mt-2 text-sm text-muted">{h.detail}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Exact hotel names are confirmed in your written quote.</p>
            </Block>
          )}

          <Block title="Day-wise itinerary">
            <ol className="relative space-y-6 border-l-2 border-dashed border-line pl-7">
              {p.itinerary.map((d) => (
                <li key={d.day} className="relative">
                  <span className="absolute -left-[37px] top-1 inline-flex size-4 rounded-full border-4 border-white bg-brand ring-2 ring-brand/20" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{d.day}</p>
                  <h3 className="mt-1 text-lg font-semibold">{d.title}</h3>
                  <p className="mt-1 text-muted">{d.description}</p>
                </li>
              ))}
            </ol>
          </Block>

          <Block title="What's included">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl bg-sand p-6">
                <h3 className="font-semibold">Inclusions</h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {p.inclusions.map((i) => (
                    <li key={i} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-[#1a9b4b]" aria-hidden /> {i}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-line p-6">
                <h3 className="font-semibold">Exclusions</h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {p.exclusions.map((i) => (
                    <li key={i} className="flex gap-2.5">
                      <X className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Block>

          <Block title="Documents needed">
            <ul className="grid gap-3 sm:grid-cols-2">
              {p.documents.map((d) => (
                <li key={d} className="flex gap-3 rounded-2xl border border-line p-4 text-sm">
                  <FileText className="size-5 shrink-0 text-brand" aria-hidden /> {d}
                </li>
              ))}
            </ul>
          </Block>

          {p.gallery && p.gallery.length > 0 && (
            <Block title="Gallery">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.gallery.map((g, i) => (
                  <div
                    key={g}
                    className={`relative aspect-square overflow-hidden rounded-3xl ${i === 0 ? "col-span-2 aspect-[2/1] sm:col-span-1 sm:aspect-square" : ""}`}
                  >
                    <SmartImage
                      src={g}
                      alt={`${p.title} – photo ${i + 1}`}
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </Block>
          )}

          {p.faqs && (
            <Block title="Frequently asked questions">
              <FaqList faqs={p.faqs} />
            </Block>
          )}

          <section id="enquire-package" className="scroll-mt-24 rounded-[1.75rem] bg-ink p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Enquire about this package</h2>
            <p className="mt-2 text-white/70">We&apos;ll reply with dates, hotels and today&apos;s best price.</p>
            <div className="mt-6">
              <EnquiryForm
                source={`Package: ${p.title}`}
                packageName={p.title}
                defaultService={serviceFor[p.category]}
                dark
              />
            </div>
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-x pb-16 sm:pb-20">
          <h2 className="text-3xl font-semibold">
            More <span className="text-ink/45">{c.shortName.toLowerCase()} packages</span>
          </h2>
          <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <PackageCard key={r.slug} pkg={r} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
