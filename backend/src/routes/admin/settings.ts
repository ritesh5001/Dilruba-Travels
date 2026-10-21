import { settingsSchema } from "@dilruba/shared/ops";
import { Router } from "express";
import { parseBody } from "../../lib/util.ts";
import { getSettings, saveSettings } from "../../services/settings.ts";

export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res) => {
  res.json(await getSettings());
});

settingsRouter.put("/", async (req, res) => {
  const data = parseBody(settingsSchema, req.body, res);
  if (!data) return;
  res.json(await saveSettings(data));
});
