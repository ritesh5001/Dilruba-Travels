import { TopBar } from "./top-bar";
import { SiteHeader } from "./site-header";
import { Footer } from "./footer";
import { WhatsAppFloat } from "./whatsapp-float";
import { MobileActionBar } from "./mobile-action-bar";
import { QuotePopup } from "./quote-popup";

/** Header, footer and floating contact buttons for every public page. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-16 md:pb-0">
      <TopBar />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
      <MobileActionBar />
      <QuotePopup />
    </div>
  );
}
