import { TopBar } from "./top-bar";
import { Footer } from "./footer";
import { WhatsAppFloat } from "./whatsapp-float";
import { MobileActionBar } from "./mobile-action-bar";

/** Header, footer and floating contact buttons for every public page. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-16 md:pb-0">
      <TopBar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
      <MobileActionBar />
    </div>
  );
}
