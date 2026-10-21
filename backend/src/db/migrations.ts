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
