import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { amountPaid, balanceDue, lineTotal, totals, PAYMENT_METHOD_LABEL } from "@/lib/billing";
import type { DocViewData, Issuer } from "@/components/billing/document-view";

const NAVY = rgb(0.043, 0.075, 0.251);
const GOLD = rgb(0.961, 0.651, 0.137);
const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.86, 0.87, 0.89);
const W = 595, H = 842, M = 48;

/** Standard PDF fonts only cover Latin-1, so currency symbols like GH₵ become codes and anything else becomes "?". */
const clean = (s: string) => s.replace(/[\r\t]/g, " ").replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "?");
const money = (minor: number, cur: string) => `${cur} ${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function wrap(text: string, font: PDFFont, size: number, max: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= max) { line = next; continue; }
      if (line) out.push(line);
      // A single word wider than the column: hard-split it.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > max) {
        let n = rest.length;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > max) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

export async function renderDocPdf(doc: DocViewData, issuer: Issuer, extra: { legalName: string; taxId: string; paymentInstructions: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const isInvoice = doc.kind === "invoice";
  const label = isInvoice ? "INVOICE" : "QUOTE";
  pdf.setTitle(`${isInvoice ? "Invoice" : "Quote"} ${doc.number}`);
  pdf.setAuthor(clean(issuer.siteName));

  let page!: PDFPage;
  let y = 0;
  const text = (t: string, x: number, yy: number, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; right?: boolean } = {}) => {
    const size = o.size ?? 10, font = o.font ?? regular, s = clean(t);
    page.drawText(s, { x: o.right ? x - font.widthOfTextAtSize(s, size) : x, y: yy, size, font, color: o.color ?? INK });
  };

  const header = () => {
    page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 92, width: W, height: 92, color: NAVY });
    page.drawRectangle({ x: 0, y: H - 96, width: W, height: 4, color: GOLD });
    text(issuer.siteName, M, H - 48, { size: 18, font: bold, color: rgb(1, 1, 1) });
    text(`${issuer.contactEmail}${issuer.phone ? `  |  ${issuer.phone}` : ""}`, M, H - 66, { size: 9, color: rgb(0.8, 0.83, 0.9) });
    text(label, W - M, H - 40, { size: 9, font: bold, color: GOLD, right: true });
    text(doc.number, W - M, H - 64, { size: 20, font: bold, color: rgb(1, 1, 1), right: true });
    y = H - 96 - 32;
  };
  const ensure = (need: number) => {
    if (y - need < M + 24) header();
  };

  header();

  // From / Billed to / dates
  const colW = (W - 2 * M) / 3;
  const block = (title: string, lines: string[], x: number) => {
    text(title.toUpperCase(), x, y, { size: 8, font: bold, color: MUTED });
    let yy = y - 14;
    lines.forEach((l, i) => {
      for (const w of wrap(l, i === 0 ? bold : regular, 10, colW - 12)) { text(w, x, yy, { font: i === 0 ? bold : regular, color: i === 0 ? INK : MUTED }); yy -= 13; }
    });
    return yy;
  };
  const fromLines = [extra.legalName || issuer.siteName, ...issuer.address.split("\n").filter(Boolean), ...(extra.taxId ? [`Tax ID: ${extra.taxId}`] : [])];
  const toLines = [doc.client.company || doc.client.name, ...(doc.client.company ? [doc.client.name] : []), doc.client.email];
  const y1 = block("From", fromLines, M);
  const y2 = block(isInvoice ? "Billed to" : "Prepared for", toLines, M + colW);
  const dates: [string, string][] = [["Issued", fmt(doc.issuedAt)], ...(doc.date ? [[isInvoice ? "Due" : "Valid until", fmt(doc.date)] as [string, string]] : []), ["Status", doc.overdue ? "Overdue" : doc.statusLabel]];
  let y3 = y;
  text("DETAILS", M + 2 * colW, y3, { size: 8, font: bold, color: MUTED });
  y3 -= 14;
  for (const [k, v] of dates) { text(k, M + 2 * colW, y3, { color: MUTED }); text(v, W - M, y3, { right: true, font: k === "Status" ? bold : regular, color: k === "Status" && doc.overdue ? rgb(0.75, 0.1, 0.1) : INK }); y3 -= 13; }
  y = Math.min(y1, y2, y3) - 18;

  // Title
  for (const l of wrap(doc.title, bold, 13, W - 2 * M)) { ensure(20); text(l, M, y, { size: 13, font: bold }); y -= 17; }
  y -= 6;

  // Items table
  const cDesc = M, cQty = W - M - 250, cUnit = W - M - 105, cAmt = W - M;
  const thead = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: rgb(0.95, 0.96, 0.97) });
    text("DESCRIPTION", cDesc + 8, y + 1, { size: 8, font: bold, color: MUTED });
    text("QTY", cQty, y + 1, { size: 8, font: bold, color: MUTED, right: true });
    text("UNIT PRICE", cUnit, y + 1, { size: 8, font: bold, color: MUTED, right: true });
    text("AMOUNT", cAmt - 8, y + 1, { size: 8, font: bold, color: MUTED, right: true });
    y -= 26;
  };
  ensure(60);
  thead();
  for (const it of doc.items) {
    const lines = wrap(it.description, regular, 10, cQty - cDesc - 70);
    ensure(lines.length * 13 + 14);
    lines.forEach((l, i) => text(l, cDesc + 8, y - i * 13));
    text(String(it.quantity), cQty, y, { right: true });
    text(money(it.unitAmount, doc.currency), cUnit, y, { right: true });
    text(money(lineTotal(it), doc.currency), cAmt - 8, y, { right: true });
    y -= lines.length * 13 + 4;
    page.drawLine({ start: { x: M, y: y + 2 }, end: { x: W - M, y: y + 2 }, thickness: 0.5, color: LINE });
    y -= 10;
  }

  // Totals
  const t = totals(doc.items, doc.taxBp);
  const paid = doc.payments ? amountPaid(doc.payments) : 0;
  const balance = doc.payments ? balanceDue(t.total, doc.payments) : t.total;
  const rows: [string, string, boolean?][] = [["Subtotal", money(t.subtotal, doc.currency)]];
  if (doc.taxBp > 0) rows.push([`Tax (${doc.taxBp / 100}%)`, money(t.tax, doc.currency)]);
  rows.push(["Total", money(t.total, doc.currency), true]);
  if (isInvoice && paid > 0) rows.push(["Paid", `-${money(paid, doc.currency)}`]);
  ensure(rows.length * 16 + 60);
  const tx = W - M - 200;
  y -= 4;
  for (const [k, v, strong] of rows) {
    text(k, tx, y, { font: strong ? bold : regular, color: strong ? INK : MUTED });
    text(v, W - M - 8, y, { right: true, font: strong ? bold : regular });
    y -= 16;
  }
  if (isInvoice) {
    y -= 4;
    page.drawRectangle({ x: tx - 10, y: y - 10, width: 218, height: 30, color: NAVY });
    text(balance <= 0 && t.total > 0 ? "Balance (PAID)" : "Balance due", tx, y, { font: bold, color: rgb(1, 1, 1), size: 10 });
    text(money(balance, doc.currency), W - M - 8, y, { right: true, font: bold, size: 12, color: GOLD });
    y -= 40;
  } else y -= 16;

  const section = (title: string, body: string) => {
    const lines = wrap(body, regular, 10, W - 2 * M);
    ensure(30);
    text(title.toUpperCase(), M, y, { size: 8, font: bold, color: MUTED });
    y -= 14;
    for (const l of lines) { ensure(14); text(l, M, y); y -= 13; }
    y -= 10;
  };
  if (isInvoice && extra.paymentInstructions) section("How to pay", `${extra.paymentInstructions}\nPlease quote ${doc.number} as the payment reference.`);
  if (doc.payments?.length) {
    ensure(30);
    text("PAYMENTS RECEIVED", M, y, { size: 8, font: bold, color: MUTED });
    y -= 14;
    for (const p of doc.payments) {
      ensure(16);
      text(`${fmt(p.paidAt)}  |  ${PAYMENT_METHOD_LABEL[p.method] ?? p.method}${p.reference ? `  |  ${p.reference}` : ""}`, M, y);
      text(money(p.amount, doc.currency), W - M, y, { right: true });
      y -= 14;
    }
    y -= 10;
  }
  if (doc.notes) section(isInvoice ? "Notes" : "Notes and terms", doc.notes);

  // Footer on every page
  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    page = pg;
    pg.drawLine({ start: { x: M, y: M }, end: { x: W - M, y: M }, thickness: 0.5, color: LINE });
    text(`Thank you for your business  |  ${issuer.siteName}`, M, M - 14, { size: 8, color: MUTED });
    text(`Page ${i + 1} of ${pages.length}`, W - M, M - 14, { size: 8, color: MUTED, right: true });
  });
  return pdf.save();
}
