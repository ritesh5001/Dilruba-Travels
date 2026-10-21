import { Router } from "express";
import { db } from "../db/index.ts";
import { toTravelPackage } from "../services/catalog.ts";

export const catalogRouter = Router();

/** Every published package, in display order. The website caches this and builds its pages from it. */
catalogRouter.get("/catalog/packages", async (_req, res) => {
  const rows = await db.selectFrom("packages").selectAll().where("published", "=", true).orderBy("sort_order").orderBy("id").execute();
  res.json({ packages: rows.map(toTravelPackage) });
});

/** Uploaded images. An id's image never changes, so browsers and the CDN may keep it forever. */
catalogRouter.get("/media/:file", async (req, res) => {
  const match = /^(\d+)\.webp$/.exec(req.params.file);
  const media = match && (await db.selectFrom("media").select(["content_type", "data"]).where("id", "=", Number(match[1])).executeTakeFirst());
  if (!media) {
    res.status(404).json({ ok: false, error: "Image not found" });
    return;
  }
  res.setHeader("Content-Type", media.content_type);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(media.data);
});
