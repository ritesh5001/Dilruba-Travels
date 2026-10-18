import { Mail, MapPin, Phone } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

export function TopBar() {
  return (
    <div className="hidden bg-ink text-xs text-white/80 md:block">
      <div className="container-x flex h-9 items-center justify-between gap-6">
        <p className="flex items-center gap-2">
          <MapPin className="size-3.5 text-amber" aria-hidden />
          Mahim East, Mumbai · Umrah, Hajj, Ziyarat &amp; Holidays
        </p>
        <div className="flex items-center gap-5">
          <a href={site.phoneHref} className="flex items-center gap-1.5 hover:text-white">
            <Phone className="size-3.5 text-amber" aria-hidden />
            {site.phone}
          </a>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white"
          >
            <WhatsAppIcon className="size-3.5 text-[#25d366]" />
            WhatsApp us
          </a>
          <a href={`mailto:${site.email}`} className="flex items-center gap-1.5 hover:text-white">
            <Mail className="size-3.5 text-amber" aria-hidden />
            {site.email}
          </a>
        </div>
      </div>
    </div>
  );
}
