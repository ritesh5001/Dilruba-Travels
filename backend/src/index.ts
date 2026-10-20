import cors from "cors";
import express from "express";
import { config } from "./config.ts";
import { db } from "./db/index.ts";
import { migrateToLatest } from "./db/migrations.ts";
import { adminRouter } from "./routes/admin/index.ts";
import { bookingsRouter } from "./routes/bookings.ts";
import { enquiryRouter } from "./routes/enquiry.ts";
import { paymentsRouter } from "./routes/payments.ts";

// Comma-separated list of sites allowed to call the API directly from the browser.
// The Next.js frontend proxies /api/* server-side, so this only matters for other clients.
const corsOrigins = config.CORS_ORIGIN?.split(",").map((o) => o.trim());

const app = express();

app.disable("x-powered-by");
// Requests arrive through the Next.js proxy; trust its X-Forwarded-For so rate limits see the visitor's IP.
app.set("trust proxy", "loopback, linklocal, uniquelocal");
app.use(cors({ origin: corsOrigins ?? false }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Mounted before express.json(): the webhook needs the raw body to check its signature.
app.use("/api/payments", paymentsRouter);

app.use(express.json({ limit: "32kb" }));

app.use("/api/enquiry", enquiryRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

// Malformed JSON bodies land here; express.json() throws with a 4xx status.
app.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ ok: false, error: status === 500 ? "Something went wrong. Please try again." : "Invalid request" });
});

// The database may still be starting (local dev, or a container restart): retry for ~30s.
for (let attempt = 1; ; attempt++) {
  try {
    await migrateToLatest(db);
    break;
  } catch (err) {
    const refused = (err as { code?: string }).code === "ECONNREFUSED";
    if (refused && attempt < 15) {
      if (attempt === 1) console.info("Waiting for the database…");
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    console.error("Could not set up the database. Check DATABASE_URL and that Postgres is running.\n", err);
    process.exit(1);
  }
}

app.listen(config.PORT, () => {
  console.info(`Backend listening on http://localhost:${config.PORT}`);
});
