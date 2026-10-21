# Dilruba Travels

Website, online booking and admin CRM for **Dilruba Travels Of India Pvt Ltd** (Mahim East, Mumbai):
Umrah, Hajj, Iraq, Jordan, Palestine and Turkey packages, plus Asia and India holidays.

An npm-workspaces monorepo:

| Folder | What | Stack |
| --- | --- | --- |
| `frontend/` | Public website, booking pages, admin panel (`/admin`) | Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4 |
| `backend/` | REST API: enquiries, bookings, payments, CRM, emails | Express 5, TypeScript, PostgreSQL (Kysely) |
| `shared/` | Code used by both: validation, business details, API types | TypeScript, zod |

## Getting started

```bash
npm install                      # from the repo root; installs every workspace
cp backend/.env.example backend/.env
npm run admin:hash -w backend    # prints ADMIN_PASSWORD_HASH=… ; paste it into backend/.env with ADMIN_EMAIL
npm run dev                      # local database + backend (:4000) + site (:3000)
```

`npm run dev` also starts a local Postgres-compatible database (PGlite) on port 5433, saved in
`backend/.data/`, so nothing needs installing. To use your own Postgres instead, point `DATABASE_URL`
at it and run `npm run dev:app`.

Without Resend or Razorpay keys everything still works locally: emails are printed in the backend
terminal, and the booking page says to contact you to pay.

```bash
npm run build      # production build of both
npm start          # run both production builds
npm run lint
npm run typecheck
```

The site calls the API at `/api/*`; the Next.js server proxies those requests to the backend, so the
browser never talks to the backend directly, admin cookies stay on the site's own domain, and no CORS
setup is needed.

## Admin panel (CRM)

Open **`/admin`** (locally http://localhost:3000/admin) and log in with `ADMIN_EMAIL` and the password
you hashed with `npm run admin:hash -w backend`. There is one owner login; change the password by
generating a new hash.

- **Dashboard:** new leads, bookings to action, confirmed trips, money received this month and still to collect, latest activity.
- **Leads:** every website enquiry (home, contact, package and CTA forms). Filter by status
  (New → Contacted → Quoted → Converted / Lost), search, WhatsApp or call the customer, add notes, and
  convert a lead into a booking.
- **Bookings:** set the total price and deposit, email the price and payment link, record payments taken
  offline (UPI, bank transfer, cash, cheque), change status (customer is emailed on confirm, cancel,
  complete), copy the customer's booking link for WhatsApp, and keep notes. Every change is logged.
- **Customers:** everyone who enquired or booked, matched by phone number, with their enquiries,
  bookings, total paid and notes.
- **Packages:** add, edit, hide or delete the packages listed on the website: title, category,
  price, days, places, highlights, hotels, day-by-day itinerary, inclusions, documents and FAQs.
  Pick the cover and gallery photos from the site's own photos or upload new ones (they're resized
  and stored in the database). Star a package to feature it on the home page; the eye icon hides it.

## Booking flow

1. On any package page the customer clicks **Book this package** (`/book/<category>/<slug>`), enters the
   lead traveller, email, phone, travel month and travellers. Nothing is paid yet.
2. They land on their private booking page (`/booking?ref=DT…&t=…`) and get a "booking received" email
   with the link. You get a "new booking" alert.
3. In the admin panel you set the total price and the deposit, then click **Send price & payment link**.
4. The customer pays the deposit (or the full balance) online through Razorpay: UPI, cards, net banking.
   Paying the deposit confirms the booking automatically; both of you get an email.
5. The balance is paid later the same way, or recorded in the admin panel if paid offline.

Payments are confirmed twice for safety: by the browser after checkout (signature checked), and by
Razorpay's webhook if the customer closes the tab. A payment is never counted twice.

### Emails (Resend)

| When | To |
| --- | --- |
| Website enquiry | Owner |
| Booking requested | Customer + owner |
| Price & payment link sent | Customer |
| Payment received (online or recorded with "email receipt") | Customer (+ owner for online) |
| Booking confirmed / cancelled / completed | Customer (optional) |

To send real email: create a Resend account, add and verify the `dilrubatravels.com` domain (it gives
DNS records to add), create an API key, and set `RESEND_API_KEY` and `EMAIL_FROM`.

### Payments (Razorpay, ICICI later)

1. In the Razorpay Dashboard (Test Mode first), copy the Key ID and Key Secret into
   `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. Add a webhook: URL `https://<your site>/api/payments/webhook`, events `payment.captured` and
   `payment.failed`, and a secret that you also put in `RAZORPAY_WEBHOOK_SECRET`.
3. Test with Razorpay's test cards/UPI, then switch to live keys after KYC.

The gateway sits behind one interface (`backend/src/payments/types.ts`). To add ICICI, write
`backend/src/payments/icici.ts` implementing it and select it with `PAYMENT_PROVIDER`; bookings, emails
and the admin panel don't change. Instructions are in `backend/src/payments/index.ts`.

## Environment variables

All variables, with comments, are in the example files:

- Development: `backend/.env.example`, `frontend/.env.example`
- Production: `backend/.env.production.example`, `frontend/.env.production.example`

| Where | Variable | Purpose |
| --- | --- | --- |
| frontend | `BACKEND_URL` | Where `/api/*` is proxied to. **Read at build time.** |
| backend | `DATABASE_URL` | PostgreSQL connection (Neon, Render… in production; `?sslmode=require`) |
| backend | `PUBLIC_SITE_URL` | Site address used in email links |
| backend | `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | The admin login |
| backend | `SESSION_SECRET` | Signs admin cookies; 32+ random characters, required in production |
| backend | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_NOTIFY_EMAIL` | Email |
| backend | `PAYMENT_PROVIDER`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Online payments |
| both | `REVALIDATE_SECRET` | Same value on both: lets package edits show on the site immediately |
| backend | `PORT`, `CORS_ORIGIN`, `DATABASE_POOL_MAX` | Server |

```bash
cp frontend/.env.production.example frontend/.env.production
cp backend/.env.production.example backend/.env
```

The site's own port is set in the shell (`PORT=3000 npm start -w frontend`), not in a `.env` file.

### Deployment notes

- The backend creates and updates its database tables itself on start (`backend/src/db/migrations.ts`).
- **Deploy the backend before the site.** The site builds its package pages from the backend's
  `/api/catalog/packages`, so a site build fails (and the previous version stays live) if the
  backend is down or older. If both deploy at once, redeploy the site once the backend is up.
- After an admin edit the backend calls `PUBLIC_SITE_URL/revalidate`, so `PUBLIC_SITE_URL` must be
  the site's real address and both sides need the same `REVALIDATE_SECRET`. Without it, edits
  still appear within an hour.
- Serve the site behind a reverse proxy or host that sets `X-Forwarded-For` (nginx, Cloudflare, Vercel,
  Render all do). Rate limits on the booking, enquiry and login forms use it to tell visitors apart.
- Use HTTPS in production: the admin cookie is marked `Secure` when `NODE_ENV=production`.

## Where things live

| What | File |
| --- | --- |
| Phone, WhatsApp, email, address | `shared/src/site.ts` |
| Packages | Admin panel → Packages (stored in the database; first copied from `backend/src/db/seed-packages.ts`) |
| Package categories | `frontend/src/lib/packages.ts` |
| How the site loads packages | `frontend/src/lib/catalog.ts` |
| Photos | `frontend/src/lib/images.ts`, `frontend/public/images/` |
| Homepage FAQs | `frontend/src/lib/faqs.ts` |
| Enquiry and booking validation, statuses | `shared/src/enquiry.ts`, `shared/src/booking.ts` |
| Admin API response types | `shared/src/crm.ts` |
| Database tables | `backend/src/db/schema.ts`, `backend/src/db/migrations.ts` |
| Booking, payment and CRM logic | `backend/src/services/crm.ts` |
| Email templates | `backend/src/email/templates.ts` |
| Payment gateways | `backend/src/payments/` |
| API routes | `backend/src/routes/` |
| Admin pages | `frontend/src/app/admin/` |
| Booking pages | `frontend/src/app/(site)/book/`, `frontend/src/app/(site)/booking/` |

## API

Public:

- `GET /api/health`
- `POST /api/enquiry`: saves a lead
- `POST /api/bookings`: booking request → `{ reference, token }`
- `GET /api/bookings/:reference?t=token`: the customer's booking
- `POST /api/bookings/:reference/pay`: starts an online payment → checkout details
- `POST /api/payments/verify`: browser confirmation after checkout
- `POST /api/payments/webhook`: gateway webhook

Admin (cookie login): `POST /api/admin/login`, `/logout`, `GET /me`, `/dashboard`, and
`/leads`, `/bookings`, `/customers` (list, detail, update, notes; plus lead convert, booking
payment-request and manual payments).

## Pages

- `/` home
- `/packages`, `/packages/[category]`, `/packages/[category]/[slug]`
- `/book/[category]/[slug]` booking form, `/booking` customer's booking page
- `/about`, `/contact`, `/terms`, `/privacy-policy`
- `/admin` CRM
- `/sitemap.xml`, `/robots.txt`

## Before launch

- Confirm package prices, durations, hotels and inclusions in Admin → Packages
  (an empty starting price shows "Best price on request").
- Replace stock photos with real group and office photos where possible.
- Review the draft Terms and Privacy Policy, and add payment, cancellation and refund terms
  (Razorpay requires these pages for live mode).
