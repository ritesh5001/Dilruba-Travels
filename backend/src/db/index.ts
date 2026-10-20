import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { config } from "../config.ts";
import type { Database } from "./schema.ts";

// Postgres returns bigint (int8) as a string; our amounts are paise and stay far below 2^53.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

const SLOW_QUERY_MS = 300;

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: config.DATABASE_POOL_MAX,
  // Reconnecting to a hosted database costs several network round trips, so keep idle
  // connections for 4 minutes (pg's default is 10 seconds). Neon suspends after 5 idle
  // minutes, so we close them just before it would.
  idleTimeoutMillis: 4 * 60_000,
  keepAlive: true,
  // Fail with an error instead of hanging if the database can't be reached.
  connectionTimeoutMillis: 20_000,
});

// The database can drop an idle connection (e.g. Neon suspending). Without this handler the
// error would crash the process; the pool simply opens a new connection on the next query.
pool.on("error", (err) => {
  console.warn("[db] idle connection closed by the server:", err.message);
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
  log(event) {
    if (event.level === "error") {
      console.error("[db] query failed:", event.query.sql, event.error);
    } else if (event.queryDurationMillis > SLOW_QUERY_MS) {
      // SQL only, never the parameters: they contain customer details.
      console.warn(`[db] slow query ${Math.round(event.queryDurationMillis)}ms: ${event.query.sql.slice(0, 200)}`);
    }
  },
});
