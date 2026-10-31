import { mkdir, chmod, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { sql } from "kysely";
import { db } from "../db/index.ts";
import { config } from "../config.ts";

// Explicit operator command only; never run by migrations or application startup.
// Keep catalogue, media, departure dates, accounts, credentials and business settings.
const tables = ["traveller_documents", "travellers", "payments", "instalments", "booking_costs", "supplier_payments", "notifications", "notes", "reviews", "feedback", "quotes", "bookings", "leads", "customers", "suppliers"] as const;
if (!process.argv.includes("--clear-crm")) throw new Error("Use --clear-crm to back up and clear CRM records.");

try {
  const dir = resolve(".data/backups");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const backup = resolve(dir, `crm-before-fresh-start-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);
  const removed = await db.transaction().execute(async (trx) => {
    // Block writes throughout the backup and deletion; reads and pg_dump still work.
    await sql.raw(`LOCK TABLE ${tables.join(", ")} IN SHARE ROW EXCLUSIVE MODE`).execute(trx);
    const counts: Record<string, number> = {};
    for (const table of tables) {
      const row = await trx.selectFrom(table).select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow();
      counts[table] = Number(row.n);
    }
    await new Promise<void>((resolve, reject) => {
      const url = new URL(config.DATABASE_URL);
      const child = spawn(process.env.PG_DUMP_BIN || "pg_dump", ["--no-password", "--format=custom", "--file", backup], {
        env: { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: url.searchParams.get("sslmode") || "verify-full", PGCHANNELBINDING: url.searchParams.get("channel_binding") || "prefer" },
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
      child.once("error", reject);
      child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Backup failed (exit ${code}): ${stderr.replaceAll(config.DATABASE_URL, "[database]")}`)));
    });
    await chmod(backup, 0o600);
    if ((await stat(backup)).size === 0) throw new Error("Backup is empty; no data was deleted.");
    for (const table of tables) await trx.deleteFrom(table).execute();
    for (const table of tables) {
      const row = await trx.selectFrom(table).select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow();
      if (Number(row.n) !== 0) throw new Error(`Reset verification failed for ${table}`);
    }
    return counts;
  });
  console.log(JSON.stringify({ backup, removed, verified: "All CRM transaction tables are empty; transaction committed" }, null, 2));
} finally {
  await db.destroy();
}
