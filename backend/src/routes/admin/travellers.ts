import { documentKinds, travellerInputSchema, visaStatusLabels } from "@dilruba/shared/ops";
import express, { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { currentUser, requirePermission } from "../../lib/auth.ts";
import { parseBody, parseId } from "../../lib/util.ts";
import { addEvent } from "../../services/crm.ts";
import { respondWithBooking } from "./bookings.ts";

// Mounted at /bookings/:id/travellers, so every route here belongs to one booking.
export const travellersRouter = Router({ mergeParams: true });

// Passport scans and visas: only roles with document access may open, add or delete them.
// Editing traveller details needs the travellers permission. (Paths are relative to here.)
travellersRouter.use("/:tid/documents", requirePermission("documents.read"));
travellersRouter.use((req, res, next) => (req.method === "GET" ? next() : requirePermission("travellers.write")(req, res, next)));

function columns(t: z.output<typeof travellerInputSchema>) {
  return {
    full_name: t.fullName,
    gender: t.gender,
    date_of_birth: t.dateOfBirth,
    phone: t.phone,
    passport_number: t.passportNumber,
    passport_issue_date: t.passportIssueDate,
    passport_expiry: t.passportExpiry,
    passport_place: t.passportPlace,
    nationality: t.nationality,
    mahram: t.mahram,
    visa_status: t.visaStatus,
    room_type: t.roomType,
    room_label: t.roomLabel,
    bus_seat: t.busSeat,
    notes: t.notes,
  };
}

async function bookingOf(req: express.Request) {
  const id = parseId((req.params as { id?: string }).id);
  return id ? db.selectFrom("bookings").select(["id", "customer_id"]).where("id", "=", id).executeTakeFirst() : undefined;
}

travellersRouter.post("/", async (req, res) => {
  const data = parseBody(travellerInputSchema, req.body, res);
  if (!data) return;
  const b = await bookingOf(req);
  if (!b) return void res.status(404).json({ ok: false, error: "Booking not found" });
  await db.insertInto("travellers").values({ booking_id: b.id, ...columns(data) }).execute();
  await addEvent(db, { booking_id: b.id, customer_id: b.customer_id, author: currentUser(res).name, body: `Traveller added: ${data.fullName}.` });
  await respondWithBooking(res, b.id);
});

travellersRouter.put("/:tid", async (req, res) => {
  const tid = parseId(req.params.tid);
  const data = parseBody(travellerInputSchema, req.body, res);
  const b = await bookingOf(req);
  if (!b || !tid) return void res.status(404).json({ ok: false, error: "Traveller not found" });
  if (!data) return;
  const before = await db.selectFrom("travellers").select("visa_status").where("id", "=", tid).where("booking_id", "=", b.id).executeTakeFirst();
  if (!before) return void res.status(404).json({ ok: false, error: "Traveller not found" });
  await db.updateTable("travellers").set({ ...columns(data), updated_at: new Date() }).where("id", "=", tid).execute();
  if (before.visa_status !== data.visaStatus) {
    await addEvent(db, { booking_id: b.id, customer_id: b.customer_id, author: currentUser(res).name, body: `${data.fullName}: visa ${visaStatusLabels[data.visaStatus].toLowerCase()}.` });
  }
  await respondWithBooking(res, b.id);
});

travellersRouter.delete("/:tid", async (req, res) => {
  const tid = parseId(req.params.tid);
  const b = await bookingOf(req);
  if (!b || !tid) return void res.status(404).json({ ok: false, error: "Traveller not found" });
  const row = await db.deleteFrom("travellers").where("id", "=", tid).where("booking_id", "=", b.id).returning("full_name").executeTakeFirst();
  if (row) await addEvent(db, { booking_id: b.id, customer_id: b.customer_id, author: currentUser(res).name, body: `Traveller removed: ${row.full_name}.` });
  await respondWithBooking(res, b.id);
});

// ---------------- Documents ----------------

const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

/** The real type from the file's first bytes: only images and PDFs are accepted. */
function sniff(buf: Buffer) {
  if (buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { type: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return { type: "image/webp", ext: "webp" };
  if (buf.subarray(0, 5).toString() === "%PDF-") return { type: "application/pdf", ext: "pdf" };
  return null;
}

/** Upload: the raw file as the body; ?kind=passport&filename=scan.jpg */
travellersRouter.post(
  "/:tid/documents",
  express.raw({ type: ["image/*", "application/pdf", "application/octet-stream"], limit: MAX_DOCUMENT_BYTES }),
  async (req, res) => {
    const tid = parseId(req.params.tid);
    const b = await bookingOf(req);
    if (!b || !tid) return void res.status(404).json({ ok: false, error: "Traveller not found" });
    const query = z
      .object({ kind: z.enum(documentKinds).default("other"), filename: z.string().trim().max(120).default("document") })
      .safeParse(req.query);
    if (!query.success) return void res.status(400).json({ ok: false, error: "Choose what kind of document this is" });
    const traveller = await db.selectFrom("travellers").select("full_name").where("id", "=", tid).where("booking_id", "=", b.id).executeTakeFirst();
    if (!traveller) return void res.status(404).json({ ok: false, error: "Traveller not found" });
    const body = req.body as Buffer;
    const kind = Buffer.isBuffer(body) && body.length ? sniff(body) : null;
    if (!kind) return void res.status(400).json({ ok: false, error: "Upload a photo (JPG, PNG, WebP) or a PDF" });
    const base = query.data.filename.replace(/\.[^.]*$/, "").replace(/[^\w\- ]+/g, "").trim().slice(0, 80) || query.data.kind;
    const me = currentUser(res);
    await db
      .insertInto("traveller_documents")
      .values({ traveller_id: tid, kind: query.data.kind, filename: `${base}.${kind.ext}`, content_type: kind.type, size: body.length, data: body, uploaded_by: me.name })
      .execute();
    await addEvent(db, { booking_id: b.id, customer_id: b.customer_id, author: me.name, body: `${query.data.kind} uploaded for ${traveller.full_name}.` });
    await respondWithBooking(res, b.id);
  },
);

/** Staff-only download. Never cached, and served only as the type its bytes proved to be. */
travellersRouter.get("/:tid/documents/:docId", async (req, res) => {
  const tid = parseId(req.params.tid);
  const docId = parseId(req.params.docId);
  const b = await bookingOf(req);
  if (!b || !tid || !docId) return void res.status(404).json({ ok: false, error: "Document not found" });
  const doc = await db
    .selectFrom("traveller_documents")
    .innerJoin("travellers", "travellers.id", "traveller_documents.traveller_id")
    .select(["traveller_documents.filename", "traveller_documents.content_type", "traveller_documents.data"])
    .where("traveller_documents.id", "=", docId)
    .where("traveller_documents.traveller_id", "=", tid)
    .where("travellers.booking_id", "=", b.id)
    .executeTakeFirst();
  if (!doc) return void res.status(404).json({ ok: false, error: "Document not found" });
  res.setHeader("Content-Type", doc.content_type);
  res.setHeader("Content-Disposition", `${req.query.download === "1" ? "attachment" : "inline"}; filename="${doc.filename}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(doc.data);
});

travellersRouter.delete("/:tid/documents/:docId", async (req, res) => {
  const tid = parseId(req.params.tid);
  const docId = parseId(req.params.docId);
  const b = await bookingOf(req);
  if (!b || !tid || !docId) return void res.status(404).json({ ok: false, error: "Document not found" });
  const owned = await db.selectFrom("travellers").select("full_name").where("id", "=", tid).where("booking_id", "=", b.id).executeTakeFirst();
  if (owned) {
    const row = await db.deleteFrom("traveller_documents").where("id", "=", docId).where("traveller_id", "=", tid).returning("filename").executeTakeFirst();
    if (row) await addEvent(db, { booking_id: b.id, customer_id: b.customer_id, author: currentUser(res).name, body: `Document ${row.filename} deleted for ${owned.full_name}.` });
  }
  await respondWithBooking(res, b.id);
});
