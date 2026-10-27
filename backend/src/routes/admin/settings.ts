import { settingsSchema, type IntegrationStatus } from "@dilruba/shared/ops";
import { Router } from "express";
import { config } from "../../config.ts";
import { parseBody } from "../../lib/util.ts";
import { paymentProvider } from "../../payments/index.ts";
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

settingsRouter.get("/integrations", (_req, res) => {
  const body: IntegrationStatus = { email: !!config.RESEND_API_KEY, onlinePayments: paymentProvider !== null };
  res.json(body);
});
