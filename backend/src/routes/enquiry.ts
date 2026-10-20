import { enquirySchema } from "@dilruba/shared/enquiry";
import { Router } from "express";

export const enquiryRouter = Router();

enquiryRouter.post("/", (req, res) => {
  const parsed = enquirySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid enquiry" });
    return;
  }

  const { website, ...enquiry } = parsed.data;

  // Bots fill the hidden honeypot field; pretend success and drop it.
  if (website) {
    res.json({ ok: true });
    return;
  }

  // TODO(CRM): save the enquiry as a new lead once the admin CRM and database are built.
  console.info("[enquiry]", JSON.stringify({ ...enquiry, receivedAt: new Date().toISOString() }));

  res.json({ ok: true });
});
