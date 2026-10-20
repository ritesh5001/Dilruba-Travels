# Dilruba Travels

Website for **Dilruba Travels Of India Pvt Ltd** (Mahim East, Mumbai): Umrah, Hajj, Iraq, Jordan,
Palestine and Turkey packages, plus Asia and India holidays. The admin CRM (`/admin`) will be added next.

An npm-workspaces monorepo:

| Folder | What | Stack |
| --- | --- | --- |
| `frontend/` | Public website | Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4 |
| `backend/` | REST API (enquiries, later the CRM) | Express 5, TypeScript |
| `shared/` | Code used by both, e.g. enquiry validation | TypeScript, zod |

## Getting started

```bash
npm install     # from the repo root; installs every workspace
npm run dev     # backend on http://localhost:4000, site on http://localhost:3000
npm run build   # production build of both
npm start       # run both production builds
npm run lint
npm run typecheck
```

Run one side only with `npm run dev -w backend` or `npm run dev -w frontend`.

The site calls the API at `/api/*`; the Next.js server proxies those requests to the backend, so the
browser never talks to the backend directly and no CORS setup is needed.

## Environment variables

| Where | Variable | Default | Purpose |
| --- | --- | --- | --- |
| `frontend/.env` | `BACKEND_URL` | `http://localhost:4000` | Where `/api/*` is proxied to |
| `backend/.env` | `PORT` | `4000` | API port |
| `backend/.env` | `CORS_ORIGIN` | none | Comma-separated origins allowed to call the API from a browser |

Copy the examples to get started (every variable has a working local default, so this is optional in development):

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

## Where things live

| What | File |
| --- | --- |
| Phone, WhatsApp, email, address | `frontend/src/lib/site.ts` |
| Package categories and packages | `frontend/src/lib/packages.ts` |
| Photos (Unsplash, free licence) | `frontend/src/lib/images.ts` |
| Homepage FAQs | `frontend/src/lib/faqs.ts` |
| Enquiry form validation (shared) | `shared/src/enquiry.ts` |
| Enquiry API (will save leads to the CRM) | `backend/src/routes/enquiry.ts` |
| API server setup | `backend/src/index.ts` |

## API

- `GET /api/health`
- `POST /api/enquiry` → `{ ok: true }` or `400 { ok: false, error }`

## Pages

- `/` home
- `/packages`, `/packages/[category]`, `/packages/[category]/[slug]`
- `/about`, `/contact`, `/terms`, `/privacy-policy`
- `/sitemap.xml`, `/robots.txt`

## Before launch

- Confirm package prices, durations, hotels and inclusions in `frontend/src/lib/packages.ts`
  (`startingPrice: null` shows "Best price on request").
- Replace stock photos with real group and office photos where possible.
- Review the draft Terms and Privacy Policy.
