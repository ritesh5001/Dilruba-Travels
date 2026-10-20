import { type Kysely, sql } from "kysely";
import { type Migration, type MigrationProvider, Migrator } from "kysely/migration";

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
