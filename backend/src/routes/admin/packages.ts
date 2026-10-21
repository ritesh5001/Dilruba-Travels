import { categoryNames, packageInputSchema, type AdminPackage } from "@dilruba/shared/catalog";
import express, { Router } from "express";
import { sql } from "kysely";
import sharp from "sharp";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { parseBody, parseId } from "../../lib/util.ts";
import { mediaUrl, packageColumns, refreshWebsite, toAdminPackage } from "../../services/catalog.ts";

export const packagesRouter = Router();
export const mediaRouter = Router();

// ---------------- Packages ----------------

packagesRouter.get("/", async (_req, res) => {
  const rows = await db.selectFrom("packages").selectAll().orderBy("sort_order").orderBy("id").execute();
  const body: AdminPackage[] = rows.map(toAdminPackage);
  res.json(body);
});

packagesRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const row = id && (await db.selectFrom("packages").selectAll().where("id", "=", id).executeTakeFirst());
  if (!row) return void res.status(404).json({ ok: false, error: "Package not found" });
  res.json(toAdminPackage(row));
});

function isUniqueViolation(err: unknown) {
  return (err as { code?: string }).code === "23505";
}

packagesRouter.post("/", async (req, res) => {
  const data = parseBody(packageInputSchema, req.body, res);
  if (!data) return;
  try {
    const row = await db.insertInto("packages").values(packageColumns(data)).returningAll().executeTakeFirstOrThrow();
    void refreshWebsite();
    res.status(201).json(toAdminPackage(row));
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    res.status(409).json({ ok: false, error: `${categoryNames[data.category]} already has a package at this URL. Change the slug.` });
  }
});

packagesRouter.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(packageInputSchema, req.body, res);
  if (!id || !data) return;
  try {
    const row = await db
      .updateTable("packages")
      .set({ ...packageColumns(data), updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    if (!row) return void res.status(404).json({ ok: false, error: "Package not found" });
    void refreshWebsite();
    res.json(toAdminPackage(row));
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    res.status(409).json({ ok: false, error: `${categoryNames[data.category]} already has a package at this URL. Change the slug.` });
  }
});

/** Quick changes from the list: show/hide, featured, order. */
packagesRouter.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(
    z.object({ published: z.boolean().optional(), featured: z.boolean().optional(), sortOrder: z.coerce.number().int().min(0).max(10_000).optional() }),
    req.body,
    res,
  );
  if (!id || !data) return;
  const row = await db
    .updateTable("packages")
    .set({ published: data.published, featured: data.featured, sort_order: data.sortOrder, updated_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
  if (!row) return void res.status(404).json({ ok: false, error: "Package not found" });
  void refreshWebsite();
  res.json(toAdminPackage(row));
});

packagesRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const row = id && (await db.deleteFrom("packages").where("id", "=", id).returning("id").executeTakeFirst());
  if (!row) return void res.status(404).json({ ok: false, error: "Package not found" });
  void refreshWebsite();
  res.json({ ok: true });
});

// ---------------- Images ----------------

// How many packages use an image, as cover or in the gallery.
const usedBy = sql<number>`(select count(*)::int from packages p where p.image = '/api/media/' || media.id || '.webp' or p.gallery ? ('/api/media/' || media.id || '.webp'))`;

mediaRouter.get("/", async (_req, res) => {
  const rows = await db
    .selectFrom("media")
    .select(["id", "width", "height", "size", "created_at"])
    .select(usedBy.as("used_by"))
    .orderBy("id", "desc")
    .execute();
  res.json(rows.map((r) => ({ id: r.id, url: mediaUrl(r.id), width: r.width, height: r.height, size: r.size, createdAt: r.created_at.toISOString(), usedBy: r.used_by })));
});

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Upload: the raw image file as the request body. It's re-encoded to WebP and capped at
 * 2400px, which also strips camera metadata (location etc.) and rejects anything that isn't
 * really an image.
 */
mediaRouter.post("/", express.raw({ type: ["image/*", "application/octet-stream"], limit: MAX_UPLOAD_BYTES }), async (req, res) => {
  const input = req.body as Buffer;
  if (!Buffer.isBuffer(input) || input.length === 0) {
    return void res.status(400).json({ ok: false, error: "Choose an image file to upload" });
  }
  const output = await sharp(input, { limitInputPixels: 60_000_000 })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);
  if (!output) {
    return void res.status(400).json({ ok: false, error: "That file isn't a supported image. Use JPG, PNG or WebP." });
  }
  const row = await db
    .insertInto("media")
    .values({ content_type: "image/webp", width: output.info.width, height: output.info.height, size: output.data.length, data: output.data })
    .returning(["id", "width", "height", "size", "created_at"])
    .executeTakeFirstOrThrow();
  res.status(201).json({ id: row.id, url: mediaUrl(row.id), width: row.width, height: row.height, size: row.size, createdAt: row.created_at.toISOString(), usedBy: 0 });
});

mediaRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return void res.status(404).json({ ok: false, error: "Image not found" });
  const row = await db.selectFrom("media").select(["id"]).select(usedBy.as("used_by")).where("id", "=", id).executeTakeFirst();
  if (!row) return void res.status(404).json({ ok: false, error: "Image not found" });
  if (row.used_by > 0) {
    return void res.status(409).json({ ok: false, error: `This image is used by ${row.used_by} package${row.used_by === 1 ? "" : "s"}. Replace it there first.` });
  }
  await db.deleteFrom("media").where("id", "=", id).execute();
  res.json({ ok: true });
});
