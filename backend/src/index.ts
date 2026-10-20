import cors from "cors";
import express from "express";
import { enquiryRouter } from "./routes/enquiry.ts";

const port = Number(process.env.PORT ?? 4000);
// Comma-separated list of sites allowed to call the API directly from the browser.
// The Next.js frontend proxies /api/* server-side, so this only matters for other clients.
const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim());

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: corsOrigins ?? false }));
app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/enquiry", enquiryRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

// Malformed JSON bodies land here; express.json() throws with a 4xx status.
app.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ ok: false, error: status === 500 ? "Something went wrong" : "Invalid request" });
});

app.listen(port, () => {
  console.info(`Backend listening on http://localhost:${port}`);
});
