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
you hashed with `npm run admin:hash -w backend`. That owner login always works; change its password by
generating a new hash. Add your team under **Staff**: each person gets their own login, and every note
and change records who made it. Roles are checked by the server on every request:

| Role | Can |
|---|---|
| Owner | Everything, incl. staff, settings and supplier costs |
| Manager | All leads, quotes, bookings, payments, travellers, packages and reports |
| Sales | Only the leads assigned to them, their quotes and those customers; bookings read-only |
| Operations | Bookings, travellers, passports and visas, departures and packages |
| Accounts | Prices, payments, instalments, invoices, supplier costs, suppliers and reports |
| Viewer | Read-only leads, customers, quotes and bookings |

The bell at the top of the panel shows each person's alerts: leads assigned to them, follow-ups due,
new website bookings (operations), online payments and overdue instalments (accounts), quote answers
and low ratings. Website leads are assigned automatically (Settings → New leads): to whoever handled
the customer before, otherwise the Sales person with the fewest open leads. The customer is thanked
straight away by email.

**Suppliers** lists everyone you buy from (airlines, hotels, visa agents, transport) with what each
booking costs you, what you've paid and what you owe. Payments clear a supplier's oldest costs first;
a mistaken payment is voided with a reason, never deleted.

- **Dashboard:** new leads, bookings to action, money received and still to collect, plus what needs
  doing today: follow-ups due, instalments due this week, passports to fix, upcoming departures with
  seats filled, and travellers' birthdays (one-tap WhatsApp greeting).
- **Leads:** every website enquiry, plus leads added by hand (phone, WhatsApp, walk-in). Set a
  follow-up date, assign to a team member, record why a lead was lost, send ready-made WhatsApp
  messages, write a quote, or convert it into a booking.
- **Quotes:** itemised price (per-person lines, discount, deposit, valid-until date). Email it or share
  the link on WhatsApp; the customer opens `/quote`, accepts it in one click, and lands on their
  booking page to pay. Accepting by phone? Record it and the booking is created at the quoted price.
- **Bookings:** price, deposit and TCS (overseas packages; the rate is in Settings), group date,
  an instalment plan with automatic email reminders, each traveller's passport, visa, mahram and room
  details with document uploads (passport scans and photos, staff-only), supplier costs and profit
  (owner only), a printable GST invoice with a running number per financial year, and post-trip
  feedback.
- **Departures:** fixed group dates with a seat limit. Open ones show on the package page with seats
  left, and customers can pick one when booking. Each has a passenger list, rooming list (grouped by
  the room name set on each traveller), print view and an Excel/CSV manifest.
- **Customers:** everyone who enquired or booked, matched by phone number, with their enquiries,
  bookings, total paid, notes and referral code. Links like `/?ref=CODE` credit the referrer on the
  new customer's enquiry or booking.
- **Reports** (owner): leads by status and source, conversion by team member, lost reasons, money
  received per month, sales and profit by category, quotes won, average rating. CSV exports.
- **Campaigns** (owner): past travellers (by category, or last trip before a date) or people who
  enquired and never booked, with a personalised WhatsApp message for each, or download the list.
- **Settings** (owner): invoice details (legal name, GSTIN, bank details), GST and TCS rates, the
  Google review link, a referral offer, and on/off switches for the automatic emails.

Automatic emails run in the backend every 30 minutes while it's awake: a reminder to the customer
3 days before each instalment and once if it's overdue, and an 8am summary to `ADMIN_NOTIFY_EMAIL`.
When a booking is marked completed, the customer gets a feedback link; 4–5 star ratings are asked
for a Google review, lower ratings email the owner.

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
  still appear within a few minutes.
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


## CRM editing, package variants and quotations

- All signed-in staff roles can update customer name, contact number and email. Sales retain their assigned-customer scope. Duplicate phone numbers are refused.
- Booking details can be edited on the booking page, including package title/link, dates, passenger counts, room sharing, mobile, passport and customer notes. Operations edit trip details; accounts edit prices; managers and owners can edit both. Customer contact details are linked from the booking. Existing traveller/passport, instalment, payment and cost controls remain available.
- Every staff member can change their own password under **Change password**. Enter the current password and confirm a new password of at least 10 characters. Owner password changes are stored as a scrypt hash in database settings, survive restarts, and override `ADMIN_PASSWORD_HASH` for that owner email. Password changes invalidate older sessions. This version requires users to sign in again after deployment.
- In **Packages**, set Single, Double, Triple and Quad prices in rupees per person. Blank rates show price on request; no rates are inferred. The website's starting price is the lowest configured variant. The booking form updates the estimate with sharing type and total passenger count. The API calculates the price from the stored package rates and ignores submitted prices.
- Configure fixed departure dates in **Departures**, linked to a package. Upcoming dates appear on package cards, package details and the booking form.
- The booking form captures name, contact number, mobile/WhatsApp, passport number, email, adults/children, available departure and room sharing. With no open departure, the details become an enquiry.
- Staff quotations and customer quote links include **Download letterhead PDF**. The PDF uses the bundled company logo plus the legal name, address, GSTIN and bank details from Settings. Public PDF access requires the quote's secret token; drafts remain staff-only. PDF generation uses [PDFKit](https://pdfkit.org/docs/getting_started.html).

Validation: `npm run test:crm -w backend` starts its own temporary PGlite database and API. It does not read `.env` or contact production services. Run `npm run typecheck`, `npm run lint` and `npm run build` for the remaining checks.

### Explicit CRM fresh start

`npm run db:fresh -w backend` backs up the complete configured database, then clears customers, leads, bookings, quotations, payments, travellers/documents, notes, instalments, costs, suppliers/payments, reviews/feedback and notifications in one transaction. Packages, images, departures, staff credentials and settings are retained. It never runs automatically. Use a `pg_dump` version matching or newer than the server; set `PG_DUMP_BIN` to its full path if needed. Protected backups are stored in ignored `backend/.data/backups/` when run through npm. Keep these files secure: they contain customer data and credentials. Restore using the matching `pg_restore` into a separate database first.
