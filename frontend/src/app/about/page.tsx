import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HandHeart, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SectionHeading } from "@/components/section-heading";
import { SmartImage } from "@/components/smart-image";
import { CtaBand } from "@/components/cta-band";
import { photo } from "@/lib/images";
import { categories } from "@/lib/packages";
import { fullAddress, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Dilruba Travels is a Mumbai travel agency in Mahim East specialising in Umrah, Hajj and ziyarat, with holidays across Asia and India.",
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: ShieldCheck,
    title: "Amanah – trust",
    text: "Your passports, payments and plans are an amanah. We handle them with care and keep you informed at every step.",
  },
  {
    icon: Scale,
    title: "Honest pricing",
    text: "Clear written quotes with hotel names, distances, inclusions and exclusions. What we quote is what you pay.",
  },
  {
    icon: HandHeart,
    title: "Personal care",
    text: "From first-time pilgrims to elderly parents, we plan around your needs, not a one-size-fits-all itinerary.",
  },
  {
    icon: Sparkles,
    title: "Experience on the ground",
    text: "Experienced group leaders and trusted partners in Makkah, Madinah, Iraq, Jordan and Turkey.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        image={photo("madinahDome", 2400)}
        eyebrow="About us"
        title="Planning journeys of the heart, from Mahim"
        subtitle="We help families and groups from Mumbai travel for Umrah, Hajj and ziyarat, and explore the world on holiday, with care at every step."
        crumbs={[{ href: "/", label: "Home" }, { label: "About Us" }]}
      />

      <section className="container-x grid gap-12 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading strong="Who" soft="we are" />
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
            <p>
              <strong className="text-ink">{site.legalName}</strong> ({site.brand}) is a travel agency based in
              Mahim East, Mumbai. Our focus is pilgrimage: Umrah and Hajj, and ziyarat to Iraq, Jordan, Palestine and
              Turkey.
            </p>
            <p>
              We also plan relaxed family and honeymoon holidays across Asia, including Dubai, Thailand, Singapore,
              Malaysia and Bali, and within India, from Kashmir to Kerala.
            </p>
            <p>
              Every journey starts with a conversation. Tell us who is travelling, when and your budget, and we will
              build a package around you, with visa, flights, hotels and ground support handled by our team.
            </p>
          </div>
          <Link href="/packages" className="btn btn-primary mt-8">
            Explore our packages <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem]">
            <SmartImage src={photo("kaaba", 900)} alt="The Kaaba in Makkah" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
          </div>
          <div className="relative mt-10 aspect-[3/4] overflow-hidden rounded-[1.75rem]">
            <SmartImage src={photo("najaf", 900)} alt="Pilgrims at the shrine in Najaf" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section className="px-3 sm:px-5">
        <div className="rounded-4xl bg-sand py-14 sm:rounded-5xl sm:py-20">
          <div className="container-x">
            <SectionHeading strong="What we" soft="stand for" center />
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map(({ icon: Icon, title, text }) => (
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
      </section>

      <section className="container-x py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading strong="What we" soft="offer" />
            <ul className="mt-6 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/packages/${c.slug}`}
                    className="inline-block rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.75rem] border border-line p-6 sm:p-8">
            <h3 className="text-xl font-semibold">Company details</h3>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                <dt className="w-32 shrink-0 text-muted">Registered name</dt>
                <dd className="font-medium">{site.legalName}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                <dt className="w-32 shrink-0 text-muted">Office</dt>
                <dd className="font-medium">{fullAddress}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                <dt className="w-32 shrink-0 text-muted">Phone</dt>
                <dd className="font-medium">{site.phone}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                <dt className="w-32 shrink-0 text-muted">Email</dt>
                <dd className="break-all font-medium">{site.email}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="pb-10 sm:pb-14">
        <CtaBand source="About page" />
      </div>
    </>
  );
}
