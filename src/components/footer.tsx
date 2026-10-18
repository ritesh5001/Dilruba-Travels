import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { generalCategories, mainCategories } from "@/lib/packages";
import { fullAddress, mapLink, site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

export function Footer() {
  return (
    <footer className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="rounded-4xl bg-ink text-white/75 sm:rounded-5xl">
        <div className="container-x grid gap-10 py-14 sm:py-16 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <div className="inline-flex rounded-full bg-white px-4 py-2">
              <Image src="/brand/logo.png" alt={site.brand} width={1200} height={320} className="h-9 w-auto" />
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed">
              Umrah, Hajj and ziyarat specialists from Mahim, Mumbai, with holidays across Asia and India.
              Honest pricing, guided groups and support on WhatsApp.
            </p>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp mt-6 !py-2.5 text-sm"
            >
              <WhatsAppIcon className="size-4" /> Chat on WhatsApp
            </a>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">Main Packages</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {mainCategories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/packages/${c.slug}`} className="hover:text-amber">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">Holidays</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {generalCategories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/packages/${c.slug}`} className="hover:text-amber">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-base font-semibold text-white">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-amber">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-amber">Contact</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-amber">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-amber">Terms &amp; Cancellation</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">Visit or call us</h3>
            <ul className="mt-4 space-y-4 text-sm">
              <li>
                <a href={mapLink} target="_blank" rel="noopener noreferrer" className="flex gap-3 hover:text-white">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
                  <span>{fullAddress}</span>
                </a>
              </li>
              <li>
                <a href={site.phoneHref} className="flex gap-3 hover:text-white">
                  <Phone className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
                  {site.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`} className="flex gap-3 break-all hover:text-white">
                  <Mail className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
                  {site.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-x flex flex-col gap-2 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>© {site.legalName}. All rights reserved.</p>
            <p>We never ask for payment through the website. Payment details are shared only after you confirm a package.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
