import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { fullAddress, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.legalName} collects, uses and protects your personal information.`,
  alternates: { canonical: "/privacy-policy" },
};

// Draft policy: to be reviewed and confirmed by Dilruba Travels before launch.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`${site.legalName} respects your privacy. This policy explains what information we collect, why we collect it and how we keep it safe.`}
      sections={[
        {
          heading: "Information we collect",
          body: [
            "When you send an enquiry we collect your name, phone number and travel preferences such as the package, travel month and number of travellers.",
            "When you book, we collect the details needed to issue visas, tickets and hotel bookings, such as passport copies, photographs and date of birth.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "We use your information only to reply to your enquiry, prepare quotes, process bookings and visas, and keep you informed about your trip.",
            "With your permission, we may send you updates about upcoming departures and offers on WhatsApp or email. You can opt out at any time.",
          ],
        },
        {
          heading: "Sharing",
          body: [
            "We share your details only with the airlines, hotels, visa authorities and ground service partners needed to deliver your booking, or when required by law. We never sell your information.",
          ],
        },
        {
          heading: "Security",
          body: [
            "We take reasonable steps to protect your information from loss, misuse or unauthorised access. Passport and identity documents are accessible only to the staff handling your booking.",
          ],
        },
        {
          heading: "Your choices",
          body: [
            `To access, correct or delete your information, or to withdraw consent, contact us at ${site.email} or ${site.phone}, or write to us at ${fullAddress}.`,
          ],
        },
      ]}
    />
  );
}
