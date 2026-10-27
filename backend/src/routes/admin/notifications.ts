import type { NotificationFeed } from "@dilruba/shared/ops";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { currentUser } from "../../lib/auth.ts";
import { parseBody } from "../../lib/util.ts";

// The bell in the admin panel: each person's own alerts.
export const notificationsRouter = Router();

notificationsRouter.get("/", async (_req, res) => {
  const me = currentUser(res);
  const [items, unread] = await Promise.all([
    db.selectFrom("notifications").selectAll().where("user_id", "=", me.id).orderBy("created_at", "desc").limit(30).execute(),
    db.selectFrom("notifications").select((eb) => eb.fn.countAll<number>().as("n")).where("user_id", "=", me.id).where("read_at", "is", null).executeTakeFirstOrThrow(),
  ]);
  const body: NotificationFeed = {
    items: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, read: n.read_at !== null, createdAt: n.created_at.toISOString() })),
    unread: Number(unread.n),
  };
  res.json(body);
});

/** Marks some alerts read ({ ids }), or all of them when no ids are given. */
notificationsRouter.post("/read", async (req, res) => {
  const data = parseBody(z.object({ ids: z.array(z.number().int().positive()).max(100).optional() }), req.body ?? {}, res);
  if (!data) return;
  let q = db.updateTable("notifications").set({ read_at: new Date() }).where("user_id", "=", currentUser(res).id).where("read_at", "is", null);
  if (data.ids?.length) q = q.where("id", "in", data.ids);
  await q.execute();
  res.json({ ok: true });
});
