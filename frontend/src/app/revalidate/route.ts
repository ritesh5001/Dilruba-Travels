import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";

// Called by the backend after a package is added, changed or removed in the admin panel,
// so the website shows the change on the next page load.

function authorized(header: string | null) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  // expire: 0 → the next visitor gets fresh data rather than the stale copy.
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
