import type { Faq } from "./packages";

export const generalFaqs: Faq[] = [
  {
    q: "Do I need to pay anything to send an enquiry?",
    a: "No. Enquiries and quotes are completely free. We never ask for payment through the website. Once you confirm a package, our team shares payment details with you privately and issues a receipt for every payment.",
  },
  {
    q: "What is included in your Umrah packages?",
    a: "Our Umrah packages include the Umrah visa, return flights from Mumbai, hotels in Makkah and Madinah, meals as per the package, all transfers and guided ziyarat. Each package page lists the exact inclusions and exclusions.",
  },
  {
    q: "Which documents are needed for an Umrah visa?",
    a: "A passport valid for at least 6 months, recent photographs with a white background, a meningitis vaccination certificate and a PAN card copy. We check every document before applying so there are no surprises.",
  },
  {
    q: "Can I pay in instalments?",
    a: "Yes. A small advance confirms your seat and the balance is paid before tickets are issued. The schedule depends on the package and departure date.",
  },
  {
    q: "Do you arrange family and group trips?",
    a: "Yes. We regularly plan trips for families, jamaats and community groups, and can arrange separate rooms, wheelchair assistance and special meals on request.",
  },
  {
    q: "Can you customise a package for my dates?",
    a: "Absolutely. Share your preferred dates, hotel category and budget on WhatsApp and we will build a package around them.",
  },
  {
    q: "Do you help with visas for Turkey, Dubai and other countries?",
    a: "Yes. Visa assistance is part of our international packages. We guide you through the documents and process for each country.",
  },
  {
    q: "Where is your office?",
    a: "Our office is at Shop 3A, Building No 5B, Baliga Nagar, Jasmine Mill Road, Mahim East, Mumbai 400017. You are welcome to visit; please call ahead so the right person is available.",
  },
];

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
