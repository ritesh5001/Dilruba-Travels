import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import type { Response } from "express";
import { formatDay, type PublicQuote, type Settings } from "@dilruba/shared/ops";
import { formatTravelMonth } from "@dilruba/shared/booking";
import { fullAddress, site } from "@dilruba/shared/site";

const money = (paise: number) => `INR ${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** One generator for staff downloads and the customer's secret quote link. */
export function quotePdf(q: PublicQuote, settings: Settings): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 158, bottom: 65, left: 48, right: 48 }, bufferPages: true,
    info: { Title: `Quotation ${q.reference}`, Author: site.brand } });
  const chunks: Buffer[] = [];
  const output = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const width = doc.page.width - 96;
  const header = () => {
    doc.image(fileURLToPath(new URL("../assets/logo.png", import.meta.url)), 48, 32, { fit: [85, 75] });
    doc.font("Helvetica-Bold").fontSize(17).fillColor("#921b2b").text(settings.legalName || site.legalName, 150, 36, { width: width - 102, height: 42, ellipsis: true });
    doc.font("Helvetica").fontSize(9).fillColor("#555555").text(settings.address || fullAddress, 150, 80, { width: width - 102, height: 26, ellipsis: true });
    doc.text(`${site.phone} | ${site.email}`, 48, 115, { width });
    if (settings.gstin) doc.text(`GSTIN: ${settings.gstin}`, 48, 128, { width });
    doc.moveTo(48, 147).lineTo(doc.page.width - 48, 147).lineWidth(2).strokeColor("#921b2b").stroke();
    doc.x = 48; doc.y = 165;
    doc.font("Helvetica").fontSize(11).fillColor("#222222");
  };

  const paragraph = (text: string, bold = false, size = 11) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor("#222222");
    doc.text(text, 48, doc.y, { width, lineGap: 3 }); doc.moveDown(0.5);
  };
  paragraph("QUOTATION", true, 20);
  paragraph(`Reference: ${q.reference} | Status: ${q.status.toUpperCase()}`);
  paragraph(`Prepared for: ${q.customerName}`, true);
  paragraph(q.title, true, 15);
  paragraph(`Travel: ${q.departure ? `${formatDay(q.departure.startDate)}${q.departure.endDate ? ` - ${formatDay(q.departure.endDate)}` : ""}` : formatTravelMonth(q.travelMonth)}`);
  paragraph(`Passengers: ${q.adults} adult(s), ${q.children} child(ren)${q.validUntil ? ` | Valid until: ${formatDay(q.validUntil)}` : ""}`);
  doc.moveDown(0.5);
  paragraph("ITEMS AND CHARGES", true);
  for (const item of q.items) {
    paragraph(item.label, true);
    paragraph(`${item.quantity} x ${money(item.unitPrice)} = ${money(item.quantity * item.unitPrice)}`);
  }
  if (q.discount > 0) paragraph(`Discount: -${money(q.discount)}`);
  paragraph(`TOTAL: ${money(q.total)}`, true, 16);
  if (q.deposit !== null) paragraph(`Deposit to confirm: ${money(q.deposit)}`);
  paragraph("Includes GST. Applicable TCS for overseas travel is added on the booking.", false, 9);
  if (q.inclusions.length) {
    doc.moveDown(); paragraph("INCLUSIONS", true);
    q.inclusions.forEach((item) => paragraph(`- ${item}`));
  }
  if (q.message) { doc.moveDown(); paragraph("NOTES", true); paragraph(q.message); }
  if (settings.bankDetails) { doc.moveDown(); paragraph("PAYMENT DETAILS", true); paragraph(settings.bankDetails); }
  doc.moveDown(); paragraph(`For assistance, contact ${site.brand} at ${site.phone}.`, false, 10);
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    header();
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor("#777777").text(`${site.brand} | ${q.reference} | Page ${i + 1} of ${pages.count}`, 48, doc.page.height - 35, { width, align: "center", lineBreak: false });
  }
  doc.end();
  return output;
}

export async function downloadQuotePdf(res: Response, q: PublicQuote, settings: Settings) {
  const pdf = await quotePdf(q, settings);
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Dilruba-Quotation-${q.reference}.pdf"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).send(pdf);
}
