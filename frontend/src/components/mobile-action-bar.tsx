import { Phone } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

// Sticky Call / WhatsApp bar on phones, where most travel enquiries come from.
export function MobileActionBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-line bg-white/95 p-2 backdrop-blur md:hidden">
      <a href={site.phoneHref} className="btn btn-outline !py-3">
        <Phone className="size-4" aria-hidden /> Call now
      </a>
      <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp !py-3">
        <WhatsAppIcon className="size-4" /> WhatsApp
      </a>
    </div>
  );
}
