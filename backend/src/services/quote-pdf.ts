import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import type { Response } from "express";
import { defaultSettings, formatDay, hotelCityLabels, type PublicQuote, type Settings } from "@dilruba/shared/ops";
import { formatTravelMonth } from "@dilruba/shared/booking";
import { fullAddress, site } from "@dilruba/shared/site";

// The quotation in the style of the company's own booking voucher: a teal letterhead box, a
// title band, the pilgrim's details, the billing table, bank details and signature boxes.
// Noto Sans is bundled because the built-in PDF fonts have no ₹ sign.

const asset = (path: string) => fileURLToPath(new URL(`../assets/${path}`, import.meta.url));
const FONT = asset("fonts/NotoSans-Regular.ttf");
const BOLD = asset("fonts/NotoSans-Bold.ttf");

const teal = "#11786b";
const tealDark = "#0d5e54";
const tealTint = "#effaf8";
const orange = "#e08a1e";
const ink = "#1f2937";
const muted = "#6b7280";
const line = "#d6e4e1";

const money = (paise: number) => `₹ ${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const statusLabel: Record<PublicQuote["status"], { text: string; color: string }> = {
  draft: { text: "AWAITING CONFIRMATION", color: orange },
  sent: { text: "AWAITING CONFIRMATION", color: orange },
  accepted: { text: "ACCEPTED", color: teal },
  declined: { text: "DECLINED", color: "#b91c1c" },
  expired: { text: "EXPIRED", color: "#b91c1c" },
};

/** One generator for staff downloads, the customer's secret quote link and the email attachment. */
export function quotePdf(q: PublicQuote, settings: Settings): Promise<Buffer> {
  const M = 40;
  const doc = new PDFDocument({ size: "A4", margins: { top: M, bottom: 60, left: M, right: M }, bufferPages: true,
    info: { Title: `Quotation ${q.reference}`, Author: site.brand } });
  const chunks: Buffer[] = [];
  const output = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont("body", FONT);
  doc.registerFont("bold", BOLD);

  const W = doc.page.width - M * 2;
  const bottom = () => doc.page.height - 60;
  /** Starts a new page when the next block wouldn't fit. */
  const room = (h: number) => {
    if (doc.y + h > bottom()) { doc.addPage(); doc.y = M; }
  };
  const text = (t: string, x: number, y: number, o: PDFKit.Mixins.TextOptions & { font?: string; size?: number; color?: string } = {}) => {
    const { font = "body", size = 9, color = ink, ...rest } = o;
    doc.font(font).fontSize(size).fillColor(color).text(t, x, y, { lineBreak: rest.width !== undefined, ...rest });
  };
  const section = (title: string) => {
    room(60);
    const y = doc.y + 10;
    text(title, M, y, { font: "bold", size: 11, color: teal });
    doc.y = y + 17;
    doc.moveTo(M, doc.y).lineTo(M + W, doc.y).lineWidth(1.5).strokeColor(orange).stroke();
    doc.y += 8;
  };

  // ---- Letterhead box
  const legalName = (settings.legalName || site.legalName).toUpperCase();
  doc.roundedRect(M, M, W, 74, 6).lineWidth(1.5).fillAndStroke(tealTint, teal);
  doc.image(asset("logo.png"), M + 12, M + 9, { fit: [56, 56] });
  const tx = M + 80;
  text(legalName, tx, M + 11, { font: "bold", size: 15, color: tealDark, width: W - 215, height: 22, ellipsis: true });
  text("Government Approved Hajj & Umrah Tour Operator | IATA Accredited Agent", tx, M + 33, { font: "bold", size: 8, width: W - 100 });
  text(`${site.phone}  |  ${site.email}`, tx, M + 46, { size: 7.5, color: muted, width: W - 100 });
  text(settings.address || fullAddress, tx, M + 57, { size: 7.5, color: muted, width: W - 100, height: 11, ellipsis: true });
  text("OFFICIAL QUOTATION", M + W - 140, M + 14, { font: "bold", size: 9, color: teal, width: 128, align: "right" });
  if (settings.gstin) text(`GSTIN: ${settings.gstin}`, M + W - 160, M + 28, { size: 7.5, color: muted, width: 148, align: "right" });

  // ---- Title band
  let y = M + 86;
  doc.roundedRect(M, y, W, 26, 4).fill(teal);
  text("QUOTATION", M, y + 5, { font: "bold", size: 13, color: "#ffffff", width: W, align: "center" });
  doc.moveTo(M + 4, y + 27).lineTo(M + W - 4, y + 27).lineWidth(2).strokeColor(orange).stroke();

  // ---- Quote number, dates and status
  y += 38;
  doc.roundedRect(M, y, W, 24, 4).lineWidth(0.8).dash(3, { space: 2 }).fillAndStroke("#fffbeb", "#f5c26b").undash();
  const status = statusLabel[q.status];
  text(`Quote No: `, M + 12, y + 7, { font: "bold", size: 8.5 });
  text(q.reference, M + 58, y + 7, { size: 8.5 });
  text("Quote Date: ", M + 150, y + 7, { font: "bold", size: 8.5 });
  text(formatDay(q.issuedAt.slice(0, 10)), M + 205, y + 7, { size: 8.5 });
  if (q.validUntil) {
    text("Valid Until: ", M + 285, y + 7, { font: "bold", size: 8.5 });
    text(formatDay(q.validUntil), M + 336, y + 7, { size: 8.5 });
  }
  text(status.text, M + W - 172, y + 7, { font: "bold", size: 8.5, color: status.color, width: 160, align: "right" });
  doc.y = y + 26;

  // ---- Pilgrim details
  section("PILGRIM & TRAVELER INFORMATION");
  const pax = `${q.adults} Adult${q.adults === 1 ? "" : "s"}${q.children ? `, ${q.children} Child${q.children === 1 ? "" : "ren"}` : ""}`;
  const travel = q.departure
    ? `${formatDay(q.departure.startDate)}${q.departure.endDate ? ` – ${formatDay(q.departure.endDate)}` : ""}`
    : formatTravelMonth(q.travelMonth);
  const rows: [string, string, string, string][] = [
    ["Lead Pilgrim Name:", q.customerName, "Total No. of Pax:", pax],
    ["Contact / Mobile:", q.customerPhone, "Departure Date:", travel],
  ];
  const half = W / 2;
  // Each text call moves doc.y, so every row is laid out from its own top.
  for (const [l1, v1, l2, v2] of rows) {
    const ry = doc.y;
    text(l1, M, ry, { font: "bold", size: 9 });
    text(v1, M + 100, ry, { size: 9, width: half - 108, height: 13, ellipsis: true });
    text(l2, M + half + 8, ry, { font: "bold", size: 9 });
    text(v2, M + half + 100, ry, { size: 9, width: half - 100, height: 13, ellipsis: true });
    doc.y = ry + 17;
  }
  const py = doc.y;
  text("Travel Package:", M, py, { font: "bold", size: 9 });
  text(q.title, M + 100, py, { size: 9, width: W - 100 });
  doc.y += 4;

  // ---- Hotels: one box per city, side by side (as on the package sheets)
  if (q.hotels.length) {
    doc.y += 12;
    const boxW = q.hotels.length > 1 ? (W - 12) / 2 : W;
    const heights = q.hotels.map((h) => 40 + (h.detail ? 12 : 0));
    const h = Math.max(...heights);
    room(h);
    const top = doc.y;
    q.hotels.slice(0, 2).forEach((hotel, i) => {
      const x = M + i * (boxW + 12);
      doc.roundedRect(x, top, boxW, h, 5).lineWidth(0.8).fillAndStroke(tealTint, "#bfe3dc");
      doc.rect(x, top, 3.5, h).fill(teal);
      text(`${hotelCityLabels[hotel.city].toUpperCase()} ACCOMMODATION`, x + 14, top + 8, { font: "bold", size: 8.5, color: teal });
      text(hotel.name, x + 14, top + 21, { font: "bold", size: 10.5, width: boxW - 24, height: 15, ellipsis: true });
      if (hotel.detail) text(hotel.detail, x + 14, top + 37, { size: 8, color: muted, width: boxW - 24, height: 12, ellipsis: true });
    });
    doc.y = top + h;
  }

  // ---- Billing table
  section("PAYMENT SUMMARY & BILLING BREAKDOWN");
  const cols = [
    { title: "Description", x: M, w: W - 290, align: "left" as const },
    { title: "No. Pax", x: M + W - 290, w: 60, align: "center" as const },
    { title: "Rate / Pax (₹)", x: M + W - 230, w: 110, align: "right" as const },
    { title: "Total Amount (₹)", x: M + W - 120, w: 110, align: "right" as const },
  ];
  room(24);
  const hy = doc.y;
  doc.rect(M, hy, W, 20).fill(teal);
  for (const c of cols) text(c.title, c.x + 8, hy + 5, { font: "bold", size: 8.5, color: "#ffffff", width: c.w - 8, align: c.align });
  doc.y = hy + 20;
  q.items.forEach((item, i) => {
    doc.font("bold").fontSize(9);
    const h = Math.max(22, doc.heightOfString(item.label, { width: cols[0].w - 12 }) + 12);
    room(h);
    const top = doc.y;
    if (i % 2) doc.rect(M, top, W, h).fill("#f7fbfa");
    text(item.label, cols[0].x + 8, top + 6, { font: "bold", size: 9, width: cols[0].w - 12 });
    text(String(item.quantity), cols[1].x + 8, top + 6, { size: 9, width: cols[1].w - 8, align: "center" });
    text(money(item.unitPrice), cols[2].x + 8, top + 6, { size: 9, width: cols[2].w - 8, align: "right" });
    text(money(item.quantity * item.unitPrice), cols[3].x + 8, top + 6, { size: 9, width: cols[3].w - 8, align: "right" });
    doc.moveTo(M, top + h).lineTo(M + W, top + h).lineWidth(0.6).strokeColor(line).stroke();
    doc.y = top + h;
  });

  // Totals, right-aligned under the table.
  const totals: { label: string; value: string; color?: string; fill?: string }[] = [];
  if (q.discount > 0) totals.push({ label: "Discount:", value: `− ${money(q.discount)}` });
  totals.push({ label: "Total Package Amount:", value: money(q.total), fill: "#f7fbfa" });
  if (q.deposit !== null) {
    totals.push({ label: "Advance Deposit to Confirm:", value: money(q.deposit), color: teal, fill: tealTint });
    totals.push({ label: "Remaining Balance Due:", value: money(Math.max(0, q.total - q.deposit)), color: "#b91c1c", fill: "#fdf2f2" });
  }
  room(totals.length * 22 + 20);
  for (const t of totals) {
    const top = doc.y;
    if (t.fill) doc.rect(cols[2].x, top, cols[2].w + cols[3].w, 22).fill(t.fill);
    text(t.label, cols[2].x - 40, top + 6, { font: "bold", size: 9, color: t.color ?? ink, width: cols[2].w + 40, align: "right" });
    text(t.value, cols[3].x + 8, top + 6, { font: "bold", size: 9.5, color: t.color ?? ink, width: cols[3].w - 8, align: "right" });
    doc.moveTo(cols[2].x, top + 22).lineTo(M + W, top + 22).lineWidth(0.6).strokeColor(line).stroke();
    doc.y = top + 22;
  }
  doc.y += 6;
  // Only what's ticked on the quote.
  const taxNote = [q.gstRate !== null && `Prices include GST @ ${q.gstRate}%.`, q.tcsRate !== null && `TCS @ ${q.tcsRate}% is added on the booking and can be claimed in your income-tax return.`].filter(Boolean).join(" ");
  if (taxNote) {
    text(taxNote, M, doc.y, { size: 7.5, color: muted, width: W });
    doc.y += 10;
  }

  // ---- Bank details ("Label: value" lines, shown two per row)
  const bank = (settings.bankDetails || defaultSettings.bankDetails).split("\n").map((l) => l.trim()).filter(Boolean);
  if (bank.length) {
    const pairs = bank.map((l) => {
      const i = l.indexOf(":");
      return i > 0 ? [l.slice(0, i + 1), l.slice(i + 1).trim()] : ["", l];
    });
    const h = 30 + Math.ceil(pairs.length / 2) * 15;
    doc.y += 6;
    room(h);
    const top = doc.y;
    doc.roundedRect(M, top, W, h, 6).lineWidth(1.2).fillAndStroke(tealTint, teal);
    text("BANK ACCOUNT PAYMENT DETAILS", M + 12, top + 9, { font: "bold", size: 9.5, color: teal });
    pairs.forEach(([label, value], i) => {
      const x = M + 12 + (i % 2) * half;
      const ry = top + 26 + Math.floor(i / 2) * 15;
      doc.font("bold").fontSize(8.5).fillColor(ink).text(label ? `${label} ` : "", x, ry, { continued: true, lineBreak: false });
      doc.font("body").text(value, { lineBreak: false });
    });
    doc.y = top + h;
  }

  // ---- Inclusions and notes
  if (q.inclusions.length) {
    section("INCLUSIONS");
    const colW = half - 8;
    for (let i = 0; i < q.inclusions.length; i += 2) {
      room(16);
      const top = doc.y;
      let h = 0;
      [q.inclusions[i], q.inclusions[i + 1]].forEach((item, j) => {
        if (!item) return;
        const x = M + j * half;
        doc.circle(x + 3, top + 6.5, 2).fill(teal);
        text(item, x + 12, top, { size: 9, width: colW - 12 });
        h = Math.max(h, doc.heightOfString(item, { width: colW - 12 }));
      });
      doc.y = top + h + 4;
    }
  }
  // ---- Day-by-day itinerary
  if (q.itinerary.length) {
    section("DAY-BY-DAY ITINERARY");
    for (const d of q.itinerary) {
      doc.font("bold").fontSize(9);
      const titleH = doc.heightOfString(d.title, { width: W - 92 });
      doc.font("body").fontSize(8.5);
      const descH = d.description ? doc.heightOfString(d.description, { width: W - 92, lineGap: 1 }) : 0;
      const h = Math.max(20, titleH + descH + 10);
      room(h);
      const top = doc.y;
      doc.roundedRect(M, top + 1, 74, 15, 3).fill(teal);
      text(d.day.toUpperCase(), M, top + 4, { font: "bold", size: 7.5, color: "#ffffff", width: 74, align: "center", height: 10, ellipsis: true });
      text(d.title, M + 86, top + 1, { font: "bold", size: 9, color: tealDark, width: W - 92 });
      if (d.description) text(d.description, M + 86, top + 2 + titleH, { size: 8.5, width: W - 92, lineGap: 1 });
      doc.moveTo(M, top + h - 2).lineTo(M + W, top + h - 2).lineWidth(0.5).dash(2, { space: 2 }).strokeColor(line).stroke().undash();
      doc.y = top + h + 2;
    }
  }

  if (q.message) {
    section("NOTES");
    room(30);
    text(q.message, M, doc.y, { size: 9, width: W, lineGap: 2 });
  }

  // ---- Signatures
  doc.y += 20;
  room(66);
  const sy = doc.y;
  doc.moveTo(M, sy + 40).lineTo(M + 200, sy + 40).lineWidth(0.8).strokeColor(ink).stroke();
  text("Customer / Pilgrim Signature", M, sy + 46, { font: "bold", size: 8.5, width: 200, align: "center" });
  const bx = M + W - 210;
  doc.roundedRect(bx, sy, 210, 36, 4).lineWidth(0.8).dash(3, { space: 2 }).stroke("#9ca3af").undash();
  text("[ Official Stamp & Seal ]", bx, sy + 13, { size: 8, color: "#9ca3af", width: 210, align: "center" });
  text("Authorized Signatory (Dilruba Travels)", bx, sy + 46, { font: "bold", size: 8.5, width: 210, align: "center" });

  // ---- Footer on every page
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    const fy = doc.page.height - 40;
    doc.moveTo(M, fy - 6).lineTo(M + W, fy - 6).lineWidth(0.6).strokeColor(line).stroke();
    text(`${settings.legalName || site.legalName} - Quotation ${q.reference}`, M, fy, { size: 7.5, color: muted });
    text(`Page ${i + 1} of ${pages.count}`, M + W - 100, fy, { size: 7.5, color: muted, width: 100, align: "right" });
  }
  doc.end();
  return output;
}

export const quotePdfName = (q: Pick<PublicQuote, "reference">) => `Dilruba-Quotation-${q.reference}.pdf`;

export async function downloadQuotePdf(res: Response, q: PublicQuote, settings: Settings) {
  const pdf = await quotePdf(q, settings);
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${quotePdfName(q)}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).send(pdf);
}
