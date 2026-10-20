import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-40 hidden size-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl shadow-black/20 transition-transform hover:scale-105 md:inline-flex"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
