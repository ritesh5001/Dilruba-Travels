import type { Metadata } from "next";
import { Suspense } from "react";
import { Phone } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CustomPackageForm } from "@/components/custom-package-form";
import { WhatsAppIcon } from "@/components/icons";
import { photo } from "@/lib/images";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Build a Custom Umrah, Hajj or Ziyarat Package",
  description: "Choose your dates, nights in Makkah and Madinah, hotel category and room sharing. Get a personalised quote from Dilruba Travels, Mumbai.",
  alternates: { canonical: "/custom-package" },
};

export default function CustomPackagePage() {
  return (
    <>
      <PageHero
        image={photo("madinahDome", 2400)}
        eyebrow="Custom package"
        title="Build your own package"
        subtitle="Your dates, your hotels, your nights in Makkah and Madinah. Tell us what you need and we'll send a personalised quote."
        crumbs={[{ href: "/", label: "Home" }, { label: "Custom package" }]}
      />
      <div className="container-x grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px]">
        <section className="rounded-[1.75rem] border border-line bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          {/* The date picker uses today's date, so the form renders in the browser. */}
          <Suspense fallback={<div className="h-[40rem] animate-pulse rounded-2xl bg-sand" aria-busy="true" />}>
            <CustomPackageForm />
          </Suspense>
        </section>
        <aside className="h-fit space-y-5">
          <div className="rounded-[1.75rem] bg-sand p-6">
            <p className="font-semibold">How it works</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>Tell us about the trip you want.</li>
              <li>We send a written quote with hotels, distances and price.</li>
              <li>Accept it online and pay a deposit to confirm.</li>
              <li>We handle visa, flights and hotels.</li>
            </ol>
          </div>
          <div className="rounded-[1.75rem] border border-line p-6">
            <p className="font-semibold">Prefer to talk?</p>
            <div className="mt-4 grid gap-2">
              <a href={whatsappLink("Assalamu Alaikum, I'd like a custom package.")} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
                <WhatsAppIcon className="size-4" /> WhatsApp us
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
