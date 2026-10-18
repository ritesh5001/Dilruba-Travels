# Dilruba Travels website

Website for **Dilruba Travels Of India Pvt Ltd** (Mahim East, Mumbai): Umrah, Hajj, Iraq, Jordan,
Palestine and Turkey packages, plus Asia and India holidays. The admin CRM (`/admin`) will be added next.

Built with Next.js 16 (App Router, Cache Components), TypeScript and Tailwind CSS v4.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

## Where things live

| What | File |
| --- | --- |
| Phone, WhatsApp, email, address | `src/lib/site.ts` |
| Package categories and packages | `src/lib/packages.ts` |
| Photos (Unsplash, free licence) | `src/lib/images.ts` |
| Homepage FAQs | `src/lib/faqs.ts` |
| Enquiry form validation | `src/lib/enquiry.ts` |
| Enquiry API (will save leads to the CRM) | `src/app/api/enquiry/route.ts` |

## Pages

- `/` home
- `/packages`, `/packages/[category]`, `/packages/[category]/[slug]`
- `/about`, `/contact`, `/terms`, `/privacy-policy`
- `/sitemap.xml`, `/robots.txt`

## Before launch

- Confirm package prices, durations, hotels and inclusions in `src/lib/packages.ts`
  (`startingPrice: null` shows "Best price on request").
- Replace stock photos with real group and office photos where possible.
- Review the draft Terms and Privacy Policy.
