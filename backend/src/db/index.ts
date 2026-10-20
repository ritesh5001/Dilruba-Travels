import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { config } from "../config.ts";
import type { Database } from "./schema.ts";

// Postgres returns bigint (int8) as a string; our amounts are paise and stay far below 2^53.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });

export const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
