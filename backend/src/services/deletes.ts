import type { Transaction } from "kysely";
import { db } from "../db/index.ts";
import type { Database } from "../db/schema.ts";

type Executor = typeof db | Transaction<Database>;

/**
 * Deletes bookings for good, with everything recorded on them: payments, refunds, travellers
 * and their documents, instalments, supplier costs, feedback and notes (the database cascades
 * all but payments). A quote that became one of these bookings goes back to being a quote.
 */
export async function deleteBookings(trx: Executor, ids: number[]) {
  if (!ids.length) return 0;
  await trx.deleteFrom("payments").where("booking_id", "in", ids).execute();
  const rows = await trx.deleteFrom("bookings").where("id", "in", ids).returning("id").execute();
  return rows.length;
}
