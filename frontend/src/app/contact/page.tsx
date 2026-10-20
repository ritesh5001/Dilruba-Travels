import type { Metadata } from "next";
import { Mail, MapPin, Navigation, Phone } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { EnquiryForm } from "@/components/enquiry-form";
import { WhatsAppIcon } from "@/components/icons";
import { photo } from "@/lib/images";
import { fullAddress, mapEmbedUrl, mapLink, site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Call ${site.phone}, WhatsApp us or visit our office in Mahim East, Mumbai for Umrah, Hajj, ziyarat and holiday packages.`,
  alternates: { canonical: "/contact" },
};

const channels = [
  { icon: Phone, label: "Call us", value: site.phone, href: site.phoneHref },
  { icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
  { icon: MapPin, label: "Visit our office", value: fullAddress, href: mapLink, external: true },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        image={photo("istanbul", 2400)}
        eyebrow="Contact"
        title="We'd love to plan your journey"
        subtitle="Send an enquiry, message us on WhatsApp or drop by our Mahim East office."
        crumbs={[{ href: "/", label: "Home" }, { label: "Contact" }]}
      />

      <section className="container-x grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-3xl bg-[#25d366] p-6 text-[#0b2e17] transition-colors hover:bg-[#1fbd5b]"
          >
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/40">
              <WhatsAppIcon className="size-6" />
            </span>
            <span>
              <span className="block text-sm font-medium opacity-80">Fastest reply</span>
              <span className="block text-xl font-semibold">Chat on WhatsApp</span>
            </span>
          </a>
          {channels.map(({ icon: Icon, label, value, href, external }) => (
            <a
              key={label}
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex items-start gap-4 rounded-3xl border border-line p-6 transition-colors hover:border-ink"
            >
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sand text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-muted">{label}</span>
                <span className="block break-words font-semibold text-ink">{value}</span>
              </span>
            </a>
          ))}
        </div>

        <div className="rounded-[1.75rem] border border-line p-6 shadow-xl shadow-black/5 sm:p-8">
          <h2 className="text-2xl font-semibold sm:text-3xl">Send us an enquiry</h2>
          <p className="mt-2 text-muted">Share a few details and we&apos;ll get back to you with a personalised quote.</p>
          <div className="mt-6">
            <EnquiryForm source="Contact page" />
          </div>
        </div>
      </section>

      <section className="px-3 pb-10 sm:px-5 sm:pb-14">
        <div className="relative overflow-hidden rounded-4xl border border-line sm:rounded-5xl">
          <iframe
            title="Dilruba Travels office location"
            src={mapEmbedUrl}
            className="h-[420px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary absolute bottom-5 left-5"
          >
            <Navigation className="size-4" aria-hidden /> Get directions
          </a>
        </div>
      </section>
    </>
  );
}
