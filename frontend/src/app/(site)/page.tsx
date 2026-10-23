import Link from "next/link";
import {
  ArrowRight,
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
import { HeroBooking, type BookablePackage } from "@/components/hero-booking";
import { Partners } from "@/components/partners";
import { Reviews } from "@/components/reviews";
import { SmartImage } from "@/components/smart-image";
import { SectionHeading } from "@/components/section-heading";
import { FaqList } from "@/components/faq-list";
import { CtaBand } from "@/components/cta-band";
import { JsonLd } from "@/components/json-ld";
import { photo } from "@/lib/images";
import { getPackages } from "@/lib/catalog";
import { faqJsonLd, generalFaqs } from "@/lib/faqs";
import { site, whatsappLink } from "@/lib/site";

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
  { title: "Pick a date", text: "Choose a package and one of our open group dates above, or ask for a custom package." },
  { title: "Get your price", text: "We confirm your seats and email the final price with hotels and inclusions." },
  { title: "Pay the deposit", text: "Pay a deposit online or by bank transfer to confirm. The balance before travel." },
  { title: "Travel", text: "We handle visa, tickets and hotels. You focus on your journey." },
];

export default async function HomePage() {
  // Packages aren't listed on the home page; the booking card offers each package's open dates.
  const bookable: BookablePackage[] = (await getPackages()).map((p) => ({ category: p.category, slug: p.slug, title: p.title, departures: p.departures ?? [] }));

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
          <div className="container-x flex flex-col items-center pb-6 pt-14 text-center text-white sm:pb-10 sm:pt-20 lg:pt-24">
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
              <HeroBooking packages={bookable} />
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

      {/* About us */}
      <section className="container-x grid gap-12 py-10 sm:py-14 lg:grid-cols-2 lg:items-center">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem]">
            <SmartImage src={photo("kaaba", 900)} alt="The Kaaba in Makkah" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
          </div>
          <div className="relative mt-10 aspect-[3/4] overflow-hidden rounded-[1.75rem]">
            <SmartImage src={photo("najaf", 900)} alt="The shrine of Imam Ali in Najaf" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
          </div>
        </div>
        <div>
          <span className="eyebrow bg-sand text-ink">About us</span>
          <SectionHeading strong="Journeys of the heart," soft="planned from Mahim" />
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
            <p>
              <strong className="text-ink">{site.legalName}</strong> is an IATA-accredited travel agency in Mahim East,
              Mumbai. We specialise in Umrah and Hajj, and ziyarat to Iraq, Jordan, Palestine and Turkey.
            </p>
            <p>
              From first-time pilgrims to elderly parents and large family groups, we handle visas, flights, hotels
              near the Haram and ground support, with a real person on WhatsApp before and during your journey.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/about" className="btn btn-primary">
              More about us <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/contact" className="btn btn-outline">Visit our office</Link>
          </div>
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

      {/* Custom package */}
      <section className="px-3 py-10 sm:px-5 sm:py-14">
        <div className="relative isolate overflow-hidden rounded-4xl bg-ink px-6 py-14 text-white sm:rounded-5xl sm:px-12 sm:py-20">
          <SmartImage src={photo("madinahDome", 2000)} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-40" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          <div className="max-w-xl">
            <span className="eyebrow bg-white text-ink">Custom package</span>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">Want something different? Build your own package.</h2>
            <p className="mt-4 text-white/85 sm:text-lg">
              Your dates, your hotels, your nights in Makkah and Madinah. Tell us what you need and we&apos;ll send a
              personalised quote.
            </p>
            <Link href="/custom-package" className="btn btn-amber mt-8">
              Build your package <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <Reviews />

      {/* Partners */}
      <Partners />

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
