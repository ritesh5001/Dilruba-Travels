import { type Kysely, sql } from "kysely";
import { type Migration, type MigrationProvider, Migrator } from "kysely/migration";
import { seedPackages } from "./seed-packages.ts";

// Migrations run in key order. Never edit one that has shipped; add a new one instead.
const migrations: Record<string, Migration> = {
  "0001_crm_and_bookings": {
    async up(db: Kysely<any>) {
      await db.schema
        .createTable("customers")
        .addColumn("id", "serial", (c) => c.primaryKey())
        .addColumn("name", "text", (c) => c.notNull())
        .addColumn("phone", "text", (c) => c.notNull().unique())
        .addColumn("email", "text")
        .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
        .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
        .execute();

      await db.schema
        .createTable("leads")
        .addColumn("id", "serial", (c) => c.primaryKey())
        .addColumn("customer_id", "integer", (c) => c.notNull().references("customers.id").onDelete("cascade"))
        .addColumn("service", "text", (c) => c.notNull())
        .addColumn("option", "text")
        .addColumn("package_name", "text")
        .addColumn("travel_month", "text")
        .addColumn("travellers", "integer")
        .addColumn("message", "text")
        .addColumn("source", "text")
        .addColumn("status", "text", (c) => c.notNull().defaultTo("new"))
        .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
        .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
        .execute();

      await db.schema
        .createTable("bookings")
        .addColumn("id", "serial", (c) => c.primaryKey())
        .addColumn("reference", "text", (c) => c.notNull().unique())
        .addColumn("access_token", "text", (c) => c.notNull())
        .addColumn("customer_id", "integer", (c) => c.notNull().references("customers.id").onDelete("restrict"))
        .addColumn("lead_id", "integer", (c) => c.references("leads.id").onDelete("set null"))
        .addColumn("package_category", "text")
        .addColumn("package_slug", "text")
        .addColumn("package_title", "text", (c) => c.notNull())
        .addColumn("travel_month", "text")
        .addColumn("adults", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("children", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("customer_notes", "text")
        .addColumn("status", "text", (c) => c.notNull().defaultTo("requested"))
        .addColumn("total_amount", "bigint")
        .addColumn("deposit_amount", "bigint")
        .addColumn("amount_paid", "bigint", (c) => c.notNull().defaultTo(0))
        .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
        .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
        .execute();

      await db.schema
        .createTable("payments")
        .addColumn("id", "serial", (c) => c.primaryKey())
        .addColumn("booking_id", "integer", (c) => c.notNull().references("bookings.id").onDelete("restrict"))
        .addColumn("provider", "text", (c) => c.notNull())
        .addColumn("provider_order_id", "text", (c) => c.unique())
        .addColumn("provider_payment_id", "text", (c) => c.unique())
        .addColumn("method", "text")
        .addColumn("amount", "bigint", (c) => c.notNull())
        .addColumn("status", "text", (c) => c.notNull())
        .addColumn("note", "text")
        .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
        .addColumn("paid_at", "timestamptz")
        .execute();

      await db.schema
        .createTable("notes")
        .addColumn("id", "serial", (c) => c.primaryKey())
        .addColumn("customer_id", "integer", (c) => c.references("customers.id").onDelete("cascade"))
        .addColumn("lead_id", "integer", (c) => c.references("leads.id").onDelete("cascade"))
        .addColumn("booking_id", "integer", (c) => c.references("bookings.id").onDelete("cascade"))
        .addColumn("kind", "text", (c) => c.notNull().defaultTo("note"))
        .addColumn("body", "text", (c) => c.notNull())
        .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
        .execute();

      await db.schema.createIndex("leads_status_idx").on("leads").columns(["status", "created_at"]).execute();
      await db.schema.createIndex("leads_customer_idx").on("leads").column("customer_id").execute();
      await db.schema.createIndex("bookings_status_idx").on("bookings").columns(["status", "created_at"]).execute();
      await db.schema.createIndex("bookings_customer_idx").on("bookings").column("customer_id").execute();
      await db.schema.createIndex("payments_booking_idx").on("payments").column("booking_id").execute();
      await db.schema.createIndex("notes_lead_idx").on("notes").column("lead_id").execute();
      await db.schema.createIndex("notes_booking_idx").on("notes").column("booking_id").execute();
      await db.schema.createIndex("notes_customer_idx").on("notes").column("customer_id").execute();
    },
  },
};

migrations["0002_list_sort_indexes"] = {
  // The admin lists sort newest first, often without a status filter.
  async up(db: Kysely<any>) {
    await db.schema.createIndex("leads_created_idx").on("leads").column("created_at").execute();
    await db.schema.createIndex("bookings_created_idx").on("bookings").column("created_at").execute();
    await db.schema.createIndex("customers_updated_idx").on("customers").column("updated_at").execute();
    await db.schema.createIndex("payments_paid_idx").on("payments").columns(["status", "paid_at"]).execute();
  },
};

migrations["0003_packages_and_media"] = {
  async up(db: Kysely<any>) {
    await db.schema
      .createTable("packages")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("category", "text", (c) => c.notNull())
      .addColumn("slug", "text", (c) => c.notNull())
      .addColumn("title", "text", (c) => c.notNull())
      .addColumn("summary", "text", (c) => c.notNull())
      .addColumn("days", "integer", (c) => c.notNull())
      .addColumn("nights", "integer", (c) => c.notNull())
      .addColumn("tier", "text")
      .addColumn("starting_price", "integer")
      .addColumn("sharing", "text")
      .addColumn("route_from", "text", (c) => c.notNull())
      .addColumn("route_to", "text", (c) => c.notNull())
      .addColumn("image", "text", (c) => c.notNull())
      .addColumn("featured", "boolean", (c) => c.notNull().defaultTo(false))
      .addColumn("published", "boolean", (c) => c.notNull().defaultTo(true))
      .addColumn("sort_order", "integer", (c) => c.notNull().defaultTo(0))
      .addColumn("places", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("gallery", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("highlights", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("hotels", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("itinerary", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("inclusions", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("exclusions", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("documents", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("faqs", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
      .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
      .addUniqueConstraint("packages_category_slug_key", ["category", "slug"])
      .execute();
    await db.schema.createIndex("packages_listing_idx").on("packages").columns(["published", "category", "sort_order"]).execute();

    await db.schema
      .createTable("media")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("content_type", "text", (c) => c.notNull())
      .addColumn("width", "integer", (c) => c.notNull())
      .addColumn("height", "integer", (c) => c.notNull())
      .addColumn("size", "integer", (c) => c.notNull())
      .addColumn("data", "bytea", (c) => c.notNull())
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
      .execute();

    // Copy the catalogue that used to be hard-coded in the website, in its original order.
    const toUrl = (name: string) => `/images/${name}.webp`;
    const rows = seedPackages.map((p, i) => ({
      category: p.category,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      days: p.days,
      nights: p.nights,
      tier: p.tier ?? null,
      starting_price: p.startingPrice,
      sharing: p.sharing ?? null,
      route_from: p.route[0],
      route_to: p.route[1],
      image: toUrl(p.image),
      featured: p.featured ?? false,
      published: true,
      sort_order: (i + 1) * 10,
      places: JSON.stringify(p.places),
      gallery: JSON.stringify((p.gallery ?? []).map(toUrl)),
      highlights: JSON.stringify(p.highlights),
      hotels: JSON.stringify(p.hotels ?? []),
      itinerary: JSON.stringify(p.itinerary),
      inclusions: JSON.stringify(p.inclusions),
      exclusions: JSON.stringify(p.exclusions),
      documents: JSON.stringify(p.documents),
      faqs: JSON.stringify(p.faqs ?? []),
    }));
    if (rows.length) await db.insertInto("packages").values(rows).execute();
  },
};

migrations["0004_crm_operations"] = {
  async up(db: Kysely<any>) {
    const now = sql`now()`;

    // Staff logins. The owner from ADMIN_EMAIL/ADMIN_PASSWORD_HASH still works and isn't stored here.
    await db.schema
      .createTable("users")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("name", "text", (c) => c.notNull())
      .addColumn("email", "text", (c) => c.notNull().unique())
      .addColumn("password_hash", "text", (c) => c.notNull())
      .addColumn("role", "text", (c) => c.notNull().defaultTo("staff"))
      .addColumn("active", "boolean", (c) => c.notNull().defaultTo(true))
      .addColumn("last_login_at", "timestamptz")
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .execute();

    await db.schema
      .alterTable("leads")
      .addColumn("follow_up_at", "timestamptz")
      .addColumn("follow_up_note", "text")
      .addColumn("lost_reason", "text")
      .addColumn("assigned_to", "integer", (c) => c.references("users.id").onDelete("set null"))
      .execute();
    await db.schema.createIndex("leads_follow_up_idx").on("leads").column("follow_up_at").where(sql.ref("follow_up_at"), "is not", null).execute();

    await db.schema.alterTable("notes").addColumn("author", "text").execute();

    await db.schema
      .alterTable("customers")
      .addColumn("referral_code", "text", (c) => c.unique())
      .addColumn("referred_by", "integer", (c) => c.references("customers.id").onDelete("set null"))
      .execute();

    // Fixed group dates for a package, e.g. "Ramadan Umrah, 1 March, 45 seats".
    await db.schema
      .createTable("departures")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("package_id", "integer", (c) => c.references("packages.id").onDelete("set null"))
      .addColumn("title", "text", (c) => c.notNull())
      .addColumn("start_date", "date", (c) => c.notNull())
      .addColumn("end_date", "date")
      .addColumn("seats", "integer", (c) => c.notNull())
      .addColumn("status", "text", (c) => c.notNull().defaultTo("open"))
      .addColumn("notes", "text")
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .execute();
    await db.schema.createIndex("departures_start_idx").on("departures").column("start_date").execute();

    await db.schema
      .alterTable("bookings")
      .addColumn("departure_id", "integer", (c) => c.references("departures.id").onDelete("set null"))
      .addColumn("tcs_amount", "bigint", (c) => c.notNull().defaultTo(0))
      .addColumn("invoice_number", "text", (c) => c.unique())
      .addColumn("invoice_date", "date")
      .addColumn("feedback_requested_at", "timestamptz")
      .execute();
    await db.schema.createIndex("bookings_departure_idx").on("bookings").column("departure_id").execute();

    // One row per person travelling, with what the visa and hotels need.
    await db.schema
      .createTable("travellers")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("booking_id", "integer", (c) => c.notNull().references("bookings.id").onDelete("cascade"))
      .addColumn("full_name", "text", (c) => c.notNull())
      .addColumn("gender", "text")
      .addColumn("date_of_birth", "date")
      .addColumn("phone", "text")
      .addColumn("passport_number", "text")
      .addColumn("passport_issue_date", "date")
      .addColumn("passport_expiry", "date")
      .addColumn("passport_place", "text")
      .addColumn("nationality", "text", (c) => c.notNull().defaultTo("Indian"))
      .addColumn("mahram", "text")
      .addColumn("visa_status", "text", (c) => c.notNull().defaultTo("not_started"))
      .addColumn("room_type", "text")
      .addColumn("room_label", "text")
      .addColumn("bus_seat", "text")
      .addColumn("notes", "text")
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .execute();
    await db.schema.createIndex("travellers_booking_idx").on("travellers").column("booking_id").execute();

    // Passport scans, photos, visas. Only ever served to logged-in staff.
    await db.schema
      .createTable("traveller_documents")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("traveller_id", "integer", (c) => c.notNull().references("travellers.id").onDelete("cascade"))
      .addColumn("kind", "text", (c) => c.notNull())
      .addColumn("filename", "text", (c) => c.notNull())
      .addColumn("content_type", "text", (c) => c.notNull())
      .addColumn("size", "integer", (c) => c.notNull())
      .addColumn("data", "bytea", (c) => c.notNull())
      .addColumn("uploaded_by", "text")
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .execute();
    await db.schema.createIndex("traveller_documents_traveller_idx").on("traveller_documents").column("traveller_id").execute();

    await db.schema
      .createTable("instalments")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("booking_id", "integer", (c) => c.notNull().references("bookings.id").onDelete("cascade"))
      .addColumn("label", "text", (c) => c.notNull())
      .addColumn("due_date", "date", (c) => c.notNull())
      .addColumn("amount", "bigint", (c) => c.notNull())
      .addColumn("reminder_sent_at", "timestamptz")
      .addColumn("overdue_sent_at", "timestamptz")
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .execute();
    await db.schema.createIndex("instalments_booking_idx").on("instalments").columns(["booking_id", "due_date"]).execute();

    // What the trip costs us: hotels, flights, visas… so each booking shows its margin.
    await db.schema
      .createTable("booking_costs")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("booking_id", "integer", (c) => c.notNull().references("bookings.id").onDelete("cascade"))
      .addColumn("category", "text", (c) => c.notNull())
      .addColumn("supplier", "text", (c) => c.notNull())
      .addColumn("amount", "bigint", (c) => c.notNull())
      .addColumn("paid", "boolean", (c) => c.notNull().defaultTo(false))
      .addColumn("note", "text")
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .execute();
    await db.schema.createIndex("booking_costs_booking_idx").on("booking_costs").column("booking_id").execute();

    await db.schema
      .createTable("quotes")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("reference", "text", (c) => c.notNull().unique())
      .addColumn("access_token", "text", (c) => c.notNull())
      .addColumn("customer_id", "integer", (c) => c.notNull().references("customers.id").onDelete("cascade"))
      .addColumn("lead_id", "integer", (c) => c.references("leads.id").onDelete("set null"))
      .addColumn("package_id", "integer", (c) => c.references("packages.id").onDelete("set null"))
      .addColumn("departure_id", "integer", (c) => c.references("departures.id").onDelete("set null"))
      .addColumn("booking_id", "integer", (c) => c.references("bookings.id").onDelete("set null"))
      .addColumn("title", "text", (c) => c.notNull())
      .addColumn("travel_month", "text")
      .addColumn("adults", "integer", (c) => c.notNull().defaultTo(1))
      .addColumn("children", "integer", (c) => c.notNull().defaultTo(0))
      .addColumn("items", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("discount", "bigint", (c) => c.notNull().defaultTo(0))
      .addColumn("deposit", "bigint")
      .addColumn("inclusions", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn("message", "text")
      .addColumn("valid_until", "date")
      .addColumn("status", "text", (c) => c.notNull().defaultTo("draft"))
      .addColumn("sent_at", "timestamptz")
      .addColumn("responded_at", "timestamptz")
      .addColumn("created_by", "text")
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .execute();
    await db.schema.createIndex("quotes_lead_idx").on("quotes").column("lead_id").execute();
    await db.schema.createIndex("quotes_customer_idx").on("quotes").column("customer_id").execute();

    await db.schema
      .createTable("feedback")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("booking_id", "integer", (c) => c.notNull().unique().references("bookings.id").onDelete("cascade"))
      .addColumn("rating", "integer", (c) => c.notNull())
      .addColumn("comment", "text")
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .execute();

    // Business details for invoices, tax rates, review link… edited on the Settings page.
    await db.schema
      .createTable("settings")
      .addColumn("key", "text", (c) => c.primaryKey())
      .addColumn("value", "jsonb", (c) => c.notNull())
      .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(now))
      .execute();
  },
};

migrations["0005_reviews"] = {
  async up(db: Kysely<any>) {
    // Customer reviews shown on the website. Added by staff (from Google, WhatsApp…) or
    // published from a customer's own feedback, which records whether they agreed to that.
    await db.schema
      .createTable("reviews")
      .addColumn("id", "serial", (c) => c.primaryKey())
      .addColumn("name", "text", (c) => c.notNull())
      .addColumn("location", "text")
      .addColumn("trip", "text")
      .addColumn("rating", "integer", (c) => c.notNull())
      .addColumn("body", "text", (c) => c.notNull())
      .addColumn("published", "boolean", (c) => c.notNull().defaultTo(false))
      .addColumn("sort_order", "integer", (c) => c.notNull().defaultTo(0))
      .addColumn("feedback_id", "integer", (c) => c.unique().references("feedback.id").onDelete("set null"))
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
      .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
      .execute();
    await db.schema.createIndex("reviews_listing_idx").on("reviews").columns(["published", "sort_order"]).execute();
    await db.schema.alterTable("feedback").addColumn("can_publish", "boolean", (c) => c.notNull().defaultTo(false)).execute();
  },
};

const provider: MigrationProvider = {
  getMigrations: async () => migrations,
};

export async function migrateToLatest(db: Kysely<any>) {
  const migrator = new Migrator({ db, provider });
  const { error, results } = await migrator.migrateToLatest();
  for (const r of results ?? []) {
    if (r.status === "Success") console.info(`Migration applied: ${r.migrationName}`);
    if (r.status === "Error") console.error(`Migration failed: ${r.migrationName}`);
  }
  if (error) throw error;
}
