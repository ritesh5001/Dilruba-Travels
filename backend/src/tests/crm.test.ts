import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createServer } from "node:net";
import pg from "pg";
import { hashPassword } from "../lib/password.ts";

// Isolated end-to-end API regression test. Never reads the project's .env.
async function port() {
  const s = createServer();
  await new Promise<void>((done) => s.listen(0, "127.0.0.1", done));
  const n = (s.address() as { port: number }).port;
  await new Promise<void>((done) => s.close(() => done()));
  return n;
}
const dir = await mkdtemp(join(tmpdir(), "dilruba-crm-test-"));
const dbPort = await port();
const apiPort = await port();
const env = { ...process.env, DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${dbPort}/postgres`, PORT: String(apiPort),
  NODE_ENV: "test", ADMIN_EMAIL: "owner@example.test", ADMIN_PASSWORD_HASH: await hashPassword("InitialPassword123"),
  SESSION_SECRET: "isolated-test-session-secret-0123456789", RESEND_API_KEY: "", REVALIDATE_SECRET: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", PUBLIC_SITE_URL: `http://127.0.0.1:${apiPort}` };
let logs = "";
const children: ChildProcess[] = [];
function start(cmd: string, args: string[]) {
  const child = spawn(cmd, args, { env, cwd: resolve(import.meta.dirname, "../.."), stdio: ["ignore", "pipe", "pipe"] });
  child.stdout?.on("data", (b: Buffer) => { logs += b.toString(); });
  child.stderr?.on("data", (b: Buffer) => { logs += b.toString(); });
  children.push(child); return child;
}
const base = `http://127.0.0.1:${apiPort}/api`;
let cookie = "";
async function request(path: string, method = "GET", body?: unknown, expected = 200, auth = cookie) {
  const res = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", Cookie: auth }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json();
  assert.equal(res.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
  return { json, cookie: res.headers.get("set-cookie")?.split(";")[0] ?? "" };
}
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
try {
  start(resolve(import.meta.dirname, "../../../node_modules/.bin/pglite-server"), [`--db=${dir}/db`, `--port=${dbPort}`, "--max-connections=10"]);
  start(process.execPath, ["src/index.ts"]);
  let ready = false;
  for (let i = 0; i < 150; i++) {
    try { ready = (await fetch(`${base}/health`)).ok; } catch { /* server starting */ }
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, `Test API did not start: ${logs}`);
  cookie = (await request("/admin/login", "POST", { email: env.ADMIN_EMAIL, password: "InitialPassword123" })).cookie;
  assert.ok(cookie);
  const packages = (await request("/admin/packages")).json;
  const pkg = packages[0];
  const roomPrices = { single: 140000, double: 110000, triple: 95000, quad: 85000 };
  const input = { ...pkg, roomPrices, tier: pkg.tier ?? null, sharing: pkg.sharing ?? null, routeFrom: pkg.route[0], routeTo: pkg.route[1], gallery: pkg.gallery ?? [], hotels: pkg.hotels ?? [], faqs: pkg.faqs ?? [], published: true };
  await request(`/admin/packages/${pkg.id}`, "PUT", input);
  const dep = (await request("/admin/departures", "POST", { packageId: pkg.id, title: "Test group", startDate: "2099-01-10", endDate: "2099-01-24", seats: 40 }, 201)).json;
  const catalog = (await request("/catalog/packages")).json.packages.find((p: { id: number }) => p.id === pkg.id);
  assert.deepEqual(catalog.roomPrices, roomPrices);
  assert.equal(catalog.startingPrice, 85000);
  assert.equal(catalog.departures[0].startDate, "2099-01-10");
  let lastBooking: { id: number; customer: { id: number } } | undefined;
  for (const [roomType, price] of Object.entries(roomPrices)) {
    const result = (await request("/bookings", "POST", { packageCategory: pkg.category, packageSlug: pkg.slug, packageTitle: "Tampered title", name: "Test Traveller", phone: "+919876543210", mobile: "+919876543211", email: "traveller@example.test", passportNumber: "a1234567", roomType, adults: 2, children: 1, departureId: dep.id, travelMonth: "2098-12", totalAmount: 1 }, 201, "")).json;
    const list = (await request("/admin/bookings")).json.items;
    const b = list.find((b: { reference: string }) => b.reference === result.reference);
    const detail = (await request(`/admin/bookings/${b.id}`)).json;
    assert.equal(detail.totalAmount, price * 3 * 100);
    assert.equal(detail.packageTitle, pkg.title);
    assert.equal(detail.travelMonth, "2099-01");
    assert.equal(detail.roomType, roomType);
    assert.equal(detail.passportNumber, "A1234567");
    assert.equal(detail.mobile, "+919876543211");
    lastBooking = detail;
  }
  assert.ok(lastBooking);
  const bid = lastBooking.id; const cid = lastBooking.customer.id;
  const edited = (await request(`/admin/bookings/${bid}`, "PATCH", { packageTitle: "Updated trip", packageCategory: "umrah", packageSlug: "updated-trip", roomType: "single", mobile: "+919812345678", passportNumber: "B7654321", customerNotes: "Wheelchair needed", adults: 1, children: 0, travelMonth: "2099-01", totalAmount: 150000, depositAmount: 30000, notifyCustomer: false })).json;
  assert.equal(edited.packageTitle, "Updated trip"); assert.equal(edited.passportNumber, "B7654321"); assert.equal(edited.customerNotes, "Wheelchair needed"); assert.equal(edited.totalAmount, 15000000);
  await request(`/admin/customers/${cid}`, "PATCH", { name: "Updated Customer", phone: "+919811112222", email: "updated@example.test" });
  assert.equal((await request(`/admin/bookings/${bid}`)).json.customer.phone, "+919811112222");
  const other = (await request("/admin/customers", "POST", { name: "Other Customer", phone: "+919822223333" }, 201)).json;
  await request(`/admin/customers/${cid}`, "PATCH", { phone: "+919822223333" }, 409);
  const quote = (await request("/admin/quotes", "POST", { customerId: cid, title: "Umrah test quotation", adults: 2, children: 0, items: [{ label: "Double sharing", quantity: 2, unitPrice: 110000 }], inclusions: ["Flights", "Hotel"] }, 201)).json;
  const pdf = await fetch(`${base}/admin/quotes/${quote.id}/pdf`, { headers: { Cookie: cookie } });
  assert.equal(pdf.status, 200); assert.equal(pdf.headers.get("content-type"), "application/pdf");
  const bytes = Buffer.from(await pdf.arrayBuffer()); assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  await writeFile(join(dir, "quotation.pdf"), bytes);
  await request(`/quotes/${quote.reference}/pdf?t=wrong-token`, "GET", undefined, 404, "");
  await request(`/quotes/${quote.reference}/pdf?t=${new URL(quote.link).searchParams.get("t")}`, "GET", undefined, 404, "");
  await request(`/admin/quotes/${quote.id}/send`, "POST", { email: false });
  const publicPdf = await fetch(`${base}/quotes/${quote.reference}/pdf?t=${new URL(quote.link).searchParams.get("t")}`);
  assert.equal(publicPdf.status, 200);
  await request(`/admin/quotes/${quote.id}/pdf`, "GET", undefined, 401, "");
  // Every signed-in staff role can edit customer contact data.
  for (const role of ["operations", "accounts", "viewer"]) {
    const staff = (await request("/admin/staff", "POST", { name: `${role} Staff`, email: `${role}@example.test`, password: "StaffPassword123", role }, 201)).json;
    const login = await request("/admin/login", "POST", { email: `${role}@example.test`, password: "StaffPassword123" });
    await request(`/admin/customers/${other.id}`, "PATCH", { name: `${role} edited` }, 200, login.cookie);
    if (role === "viewer") await request(`/admin/bookings/${bid}`, "PATCH", { packageTitle: "Forbidden" }, 403, login.cookie);
    // Staff passwords also survive a new login and invalidate earlier sessions.
    if (role === "operations") {
      const changed = await request("/admin/change-password", "POST", { currentPassword: "StaffPassword123", newPassword: "NewStaffPassword123" }, 200, login.cookie);
      await request("/admin/me", "GET", undefined, 401, login.cookie);
      await request("/admin/me", "GET", undefined, 200, changed.cookie);
      await request("/admin/login", "POST", { email: `${role}@example.test`, password: "NewStaffPassword123" });
    }
    assert.ok(staff);
  }
  await request("/admin/change-password", "POST", { currentPassword: "wrong", newPassword: "UpdatedPassword123" }, 400);
  const oldCookie = cookie;
  cookie = (await request("/admin/change-password", "POST", { currentPassword: "InitialPassword123", newPassword: "UpdatedPassword123" })).cookie;
  await request("/admin/me", "GET", undefined, 401, oldCookie);
  await request("/admin/me");
  await request("/admin/login", "POST", { email: env.ADMIN_EMAIL, password: "InitialPassword123" }, 401);
  await request("/admin/login", "POST", { email: env.ADMIN_EMAIL, password: "UpdatedPassword123" });
  const stored = await pool.query("select value from settings where key = 'internal:ownerPassword'");
  assert.equal(stored.rows[0].value.email, env.ADMIN_EMAIL);
  console.log("PASS: room variants, authoritative totals, fixed dates, booking/customer editing, staff permissions, secure PDF downloads, owner/staff password changes and session invalidation.");
} catch (err) {
  console.error(logs.slice(-5000));
  throw err;
} finally {
  await pool.end();
  for (const child of children.reverse()) { child.kill("SIGTERM"); await new Promise<void>((done) => child.once("exit", () => done())); }
  await rm(dir, { recursive: true, force: true });
}
