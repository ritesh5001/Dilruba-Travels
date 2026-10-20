import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Cancellation Policy",
  description: `Booking, payment, cancellation and refund terms for ${site.legalName}.`,
  alternates: { canonical: "/terms" },
};

// Draft terms: to be reviewed and confirmed by Dilruba Travels before launch.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Cancellation Policy"
      intro={`These terms apply to all bookings made with ${site.legalName} ("Dilruba Travels", "we", "us") in person, by phone, on WhatsApp, by email or through this website.`}
      sections={[
        {
          heading: "Enquiries and quotes",
          body: [
            "Submitting an enquiry on this website is free and does not create a booking. We reply with a written quote that lists the hotels, inclusions, exclusions and price.",
            "All quotes are subject to availability of flights, hotels and visas at the time of confirmation. Prices may change until the booking is confirmed and the advance is received.",
          ],
        },
        {
          heading: "Booking and payment",
          body: [
            "A booking is confirmed once you accept the quote and pay the advance amount mentioned in it. The balance must be paid by the due date in your quote, usually before tickets are issued.",
            "We never ask for payment through this website. Payment details are shared privately by our team after you confirm, and a receipt is issued for every payment.",
          ],
        },
        {
          heading: "Documents and visas",
          body: [
            "Travellers are responsible for providing valid passports and the documents required for visas. Visa approval is at the sole discretion of the issuing government; we assist with the process but cannot guarantee approval.",
          ],
        },
        {
          heading: "Changes and cancellations",
          body: [
            "Changes or cancellations must be requested in writing (WhatsApp or email). Airlines, hotels and other suppliers apply their own change and cancellation charges, which are passed on to you, along with our service charges as stated in your quote.",
            "Some fares and hotel rates are non-refundable. Your quote will mention when this applies.",
          ],
        },
        {
          heading: "Refunds",
          body: [
            "Refunds depend on the terms of the relevant supplier. Where we process a refund on your behalf, it is paid to you after we receive it from the supplier. Airline refunds can take several weeks.",
          ],
        },
        {
          heading: "Our responsibility",
          body: [
            "We act as an agent for airlines, hotels and ground service providers. We are not liable for delays, cancellations or changes caused by suppliers, government decisions, weather or other events beyond our control, but we will always do our best to help.",
          ],
        },
        {
          heading: "Governing law",
          body: ["These terms are governed by the laws of India, with jurisdiction in the courts of Mumbai, Maharashtra."],
        },
        {
          heading: "Contact",
          body: [`For any questions about these terms, call ${site.phone} or email ${site.email}.`],
        },
      ]}
    />
  );
}
