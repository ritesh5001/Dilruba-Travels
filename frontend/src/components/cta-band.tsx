import { Clock, Phone } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";
import { EnquiryForm } from "./enquiry-form";
import { WhatsAppIcon } from "./icons";

export function CtaBand({ source = "CTA band" }: { source?: string }) {
  return (
    <section id="enquire" className="px-3 sm:px-5">
      <div className="relative overflow-hidden rounded-4xl bg-brand sm:rounded-5xl">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-amber/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-flame/60 blur-3xl" />
        <div className="container-x relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div className="text-white">
            <span className="eyebrow bg-white/15 text-white">Free, no-obligation quote</span>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
              Tell us your plans. We&apos;ll handle the rest.
            </h2>
            <p className="mt-4 max-w-md text-white/85">
              Share a few details and our team will send a personalised quote with hotels, dates and the best
              available price.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
                <WhatsAppIcon className="size-4" /> WhatsApp us
              </a>
              <a href={site.phoneHref} className="btn btn-white">
                <Phone className="size-4" aria-hidden /> {site.phone}
              </a>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-white/80">
              <Clock className="size-4" aria-hidden /> Prefer a call back? Leave your number and we&apos;ll ring you.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white p-5 shadow-2xl shadow-black/20 sm:p-7">
            <EnquiryForm source={source} />
          </div>
        </div>
      </div>
    </section>
  );
}
