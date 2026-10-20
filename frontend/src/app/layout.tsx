import type { Metadata, Viewport } from "next";
import "@fontsource-variable/outfit";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { MobileActionBar } from "@/components/mobile-action-bar";
import { JsonLd } from "@/components/json-ld";
import { fullAddress, site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `Umrah Packages, Hajj & Tours from Mumbai | ${site.name}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_IN",
    images: ["/brand/logo.png"],
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#dc2025",
};

const organization = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: site.legalName,
  alternateName: site.brand,
  url: site.url,
  logo: `${site.url}/brand/logo.png`,
  telephone: site.phone,
  email: site.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${site.address.line1}, ${site.address.line2}`,
    addressLocality: site.address.city,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country,
  },
  areaServed: "Mumbai",
  description: `${site.description} Office: ${fullAddress}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col pb-16 md:pb-0">
        <JsonLd data={organization} />
        <TopBar />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppFloat />
        <MobileActionBar />
      </body>
    </html>
  );
}
