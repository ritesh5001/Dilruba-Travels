import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { BookingForm } from "@/components/booking-form";
import { WhatsAppIcon } from "@/components/icons";
import { getPackage, packageParams } from "@/lib/catalog";
import { formatPrice, getCategory, packageHref, packageWhatsappMessage } from "@/lib/packages";
import { site, whatsappLink } from "@/lib/site";

export async function generateStaticParams() {
  return packageParams();
}

export async function generateMetadata(props: PageProps<"/book/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await props.params;
  const p = await getPackage(category, slug);
  if (!p) return {};
  return { title: `Book ${p.title}`, robots: { index: false } };
}

export default async function BookPackagePage(props: PageProps<"/book/[category]/[slug]">) {
  const { category, slug } = await props.params;
  const p = await getPackage(category, slug);
  const c = getCategory(category);
  if (!p || !c) notFound();
  const price = formatPrice(p.startingPrice);

  return (
    <>
      <PageHero
        image={p.image}
        eyebrow="Book your journey"
        title={p.title}
        subtitle="Tell us who's travelling and when. We'll confirm availability and email your final price."
        crumbs={[
          { href: "/packages", label: "Packages" },
          { href: `/packages/${c.slug}`, label: c.shortName },
          { href: packageHref(p), label: p.title },
          { label: "Book" },
        ]}
      />

      <div className="container-x grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_340px]">
        <section className="rounded-[1.75rem] border border-line bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <h2 className="text-2xl font-semibold">Traveller details</h2>
          <p className="mt-1 text-sm text-muted">Takes about a minute. We reply within one working day.</p>
          <div className="mt-6">
            {/* The form reads the referral code from the browser, so it renders on the client. */}
            <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-sand" aria-busy="true" />}>
              <BookingForm pkg={p} />
            </Suspense>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[1.75rem] bg-sand p-6">
            <p className="eyebrow">Your package</p>
            <p className="mt-2 font-display text-xl font-semibold">{p.title}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li className="flex gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {p.days} days / {p.nights} nights</li>
              <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {p.places.join(", ")}</li>
            </ul>
            <p className="mt-4 border-t border-line pt-4 text-sm">
              {price ? <>From <strong>{price}</strong> per person</> : <strong>Best price on request</strong>}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-line p-6">
            <p className="font-semibold">How booking works</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>Send your booking request (no payment).</li>
              <li>We email your final price and booking link.</li>
              <li>Pay the deposit online by UPI, card or net banking to confirm.</li>
              <li>Pay the balance before travel.</li>
            </ol>
            <div className="mt-5 grid gap-2">
              <a href={whatsappLink(packageWhatsappMessage(p))} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
                <WhatsAppIcon className="size-4" /> Ask on WhatsApp
              </a>
              <a href={site.phoneHref} className="btn btn-outline">
                <Phone className="size-4" aria-hidden /> {site.phone}
              </a>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
