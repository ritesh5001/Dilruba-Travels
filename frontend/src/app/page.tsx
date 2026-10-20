import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  FileCheck2,
  Headset,
  Hotel,
  MessageCircleMore,
  PlaneTakeoff,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Header } from "@/components/header";
import { HeroEnquiryCard } from "@/components/enquiry-form";
import { SmartImage } from "@/components/smart-image";
import { Carousel } from "@/components/carousel";
import { PackageCard } from "@/components/package-card";
import { SectionHeading } from "@/components/section-heading";
import { FaqList } from "@/components/faq-list";
import { CtaBand } from "@/components/cta-band";
import { JsonLd } from "@/components/json-ld";
import { photo } from "@/lib/images";
import { generalCategories, getPackagesByCategory, mainCategories, packages } from "@/lib/packages";
import { faqJsonLd, generalFaqs } from "@/lib/faqs";
import { whatsappLink } from "@/lib/site";

const trustPoints = [
  { icon: FileCheck2, title: "Visa handled for you", text: "Documents checked and filed by our team" },
  { icon: Hotel, title: "Hotels near the Haram", text: "Clear walking distances, no surprises" },
  { icon: Users, title: "Guided groups", text: "Experienced group leaders from Mumbai" },
  { icon: Headset, title: "WhatsApp support", text: "Real people, before and during your trip" },
];

const whyUs = [
  {
    icon: ReceiptText,
    title: "Transparent pricing",
    text: "Every quote lists hotels, distances, inclusions and exclusions in writing. No hidden charges later.",
  },
  {
    icon: ShieldCheck,
    title: "Safe, private payments",
    text: "We never take payment on the website. Details are shared privately after you confirm, with a receipt for every payment.",
  },
  {
    icon: BadgeCheck,
    title: "Umrah & ziyarat specialists",
    text: "Makkah, Madinah, Karbala, Najaf, Al-Aqsa and Istanbul are our home ground. We know the routes and the rites.",
  },
  {
    icon: MessageCircleMore,
    title: "Local office in Mahim",
    text: "Walk in, meet the team and plan face-to-face at our Mahim East office.",
  },
];

const steps = [
  { title: "Enquire", text: "Fill the short form or message us on WhatsApp." },
  { title: "Get your quote", text: "Receive a personalised quote with hotels, dates and price." },
  { title: "Confirm", text: "Pick your package and pay a small advance privately." },
  { title: "Travel", text: "We handle visa, tickets and hotels. You focus on your journey." },
];

// Tiles for the six main categories: fills 2 columns on tablets and 4 on desktop with no gaps.
const bentoSpans = [
  "sm:col-span-2 sm:row-span-2",
  "",
  "",
  "lg:col-span-2",
  "lg:col-span-2",
  "sm:col-span-2",
];

export default function HomePage() {
  const featured = packages.filter((p) => p.featured);

  return (
    <>
      <JsonLd data={faqJsonLd(generalFaqs)} />

      {/* 1. Hero */}
      <section className="px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="relative isolate overflow-hidden rounded-4xl bg-ink sm:rounded-5xl">
          <SmartImage
            src={photo("kaabaAerial", 2400)}
            alt="Pilgrims around the Kaaba at Masjid al-Haram, Makkah"
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />
          <Header />

          <div className="container-x flex flex-col items-center pb-6 pt-32 text-center text-white sm:pb-10 sm:pt-40 lg:pt-44">
            <span className="eyebrow bg-white text-ink">Umrah · Hajj · Ziyarat · Holidays</span>
            <h1 className="mt-5 max-w-4xl text-[2.6rem] font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
              Your Sacred Journey, Planned with Care.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-white/85 sm:text-lg">
              Umrah, Hajj and ziyarat packages from Mumbai with visa, flights and hotels near the Haram, plus
              holidays across Asia and India.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/packages/umrah" className="btn btn-amber">
                Explore Umrah Packages <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-white">
                Talk to us on WhatsApp
              </a>
            </div>

            <div className="mt-12 w-full max-w-5xl text-left sm:mt-16">
              <HeroEnquiryCard />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Trust strip */}
      <section className="container-x py-10 sm:py-14">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {trustPoints.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-3 rounded-3xl bg-sand p-5 sm:flex-row sm:items-center">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-ink">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Popular packages */}
      <section className="container-x py-10 sm:py-14">
        <Carousel
          heading={
            <SectionHeading
              strong="Popular"
              soft="packages"
              intro="Hand-picked journeys our travellers love. Tap any package for hotels, itinerary and inclusions."
            />
          }
        >
          {featured.map((p) => (
            <PackageCard key={p.slug} pkg={p} className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[calc(25%-15px)]" />
          ))}
        </Carousel>
      </section>

      {/* 4. Main packages */}
      <section className="container-x py-10 sm:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            strong="Sacred"
            soft="journeys"
            intro="Our main packages: from Umrah and Hajj to ziyarat in Iraq, Jordan, Palestine and Turkey."
          />
          <Link href="/packages" className="btn btn-outline shrink-0 self-start sm:self-auto">
            View all packages <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-10 grid auto-rows-[220px] gap-4 sm:auto-rows-[260px] sm:grid-cols-2 lg:grid-cols-4">
          {mainCategories.map((c, i) => {
            const count = getPackagesByCategory(c.slug).length;
            const big = i === 0;
            return (
              <Link
                key={c.slug}
                href={`/packages/${c.slug}`}
                className={`group relative isolate overflow-hidden rounded-[1.75rem] bg-ink ${bentoSpans[i] ?? ""}`}
              >
                <SmartImage
                  src={photo(c.image, big ? 1600 : 900)}
                  alt={c.name}
                  fill
                  sizes={big ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"}
                  className="-z-10 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full bg-white/90 text-ink transition-colors group-hover:bg-amber">
                  <ArrowUpRight className="size-5" aria-hidden />
                </span>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-amber">
                    {count} {count === 1 ? "package" : "packages"}
                  </p>
                  <h3 className={`mt-1 font-semibold ${big ? "text-3xl sm:text-4xl" : "text-2xl"}`}>{c.name}</h3>
                  <p className={`mt-1 text-sm text-white/80 ${big ? "max-w-sm sm:text-base" : "line-clamp-1"}`}>
                    {c.tagline}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Why choose us */}
      <section className="px-3 py-10 sm:px-5 sm:py-14">
        <div className="rounded-4xl bg-sand py-14 sm:rounded-5xl sm:py-20">
          <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] sm:aspect-[5/5]">
                <SmartImage
                  src={photo("madinah", 1400)}
                  alt="Masjid an-Nabawi in Madinah"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 right-4 flex max-w-[17rem] gap-3 rounded-3xl bg-white p-5 shadow-xl shadow-black/10 sm:right-8">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-amber/20 text-gold">
                  <ReceiptText className="size-5" aria-hidden />
                </span>
                <p className="text-sm text-muted">
                  <span className="block font-semibold text-ink">Every quote in writing</span>
                  Hotel names, walking distances and everything included.
                </p>
              </div>
            </div>
            <div>
              <SectionHeading
                strong="Why travel"
                soft="with Dilruba"
                intro="Umrah and ziyarat are once-in-a-lifetime journeys. We plan them with the care they deserve."
              />
              <ul className="mt-8 grid gap-5 sm:grid-cols-2">
                {whyUs.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="rounded-3xl bg-white p-6">
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm text-muted">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How it works */}
      <section className="container-x py-10 sm:py-14">
        <SectionHeading strong="How it" soft="works" intro="Four simple steps from enquiry to take-off." center />
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-3xl border border-line p-6">
              <span className="font-display text-5xl font-semibold text-amber/80">0{i + 1}</span>
              <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.text}</p>
              {i < steps.length - 1 && (
                <span className="absolute -right-[22px] top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-brand lg:inline-flex">
                  <PlaneTakeoff className="size-4" aria-hidden />
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* 7. Holidays */}
      <section className="container-x py-10 sm:py-14">
        <SectionHeading
          strong="Holidays"
          soft="for every family"
          intro="Beyond pilgrimage: relaxed, well-planned holidays across Asia and India."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {generalCategories.map((c) => {
            const items = getPackagesByCategory(c.slug);
            return (
              <Link
                key={c.slug}
                href={`/packages/${c.slug}`}
                className="group relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white sm:p-8"
              >
                <SmartImage
                  src={photo(c.image, 1400)}
                  alt={c.name}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="-z-10 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <h3 className="text-3xl font-semibold sm:text-4xl">{c.name}</h3>
                <p className="mt-2 max-w-md text-white/85">{c.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {items.map((p) => (
                    <span key={p.slug} className="rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
                      {p.route[1]}
                    </span>
                  ))}
                </div>
                <span className="mt-6 inline-flex items-center gap-2 font-semibold text-amber">
                  Explore {c.name} <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 8. FAQ */}
      <section className="container-x grid gap-10 py-10 sm:py-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading
            strong="Questions,"
            soft="answered"
            intro="Still unsure about something? Message us on WhatsApp and we'll explain everything."
          />
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6">
            Ask a question
          </a>
        </div>
        <FaqList faqs={generalFaqs} />
      </section>

      {/* 9. Final CTA */}
      <div className="py-10 sm:py-14">
        <CtaBand source="Homepage CTA" />
      </div>
    </>
  );
}
