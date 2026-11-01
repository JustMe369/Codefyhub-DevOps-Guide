import path from "node:path";
import PDFDocument from "pdfkit";

const fontDirectory = path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans", "files");
const regularFont = path.join(fontDirectory, "noto-sans-latin-400-normal.woff");
const boldFont = path.join(fontDirectory, "noto-sans-latin-700-normal.woff");

export type WorkflowPdfInput = {
  title: string;
  description: string;
  body: string;
  sectionTitle: string;
  verifiedBy: string;
  verificationMethod: string;
  lastVerifiedAt: Date;
  sources: Array<{ organization: string; title: string; url: string; claimScope: string | null }>;
};

const colors = {
  ink: "#10231d",
  muted: "#526b62",
  accent: "#0b8f72",
  accentSoft: "#e8f7f2",
  border: "#cadbd5",
  code: "#eef4f2",
};

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, "")
    .trim();
}

function formatVerifiedDate(value: Date) {
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][value.getUTCMonth()];
  return `${month} ${value.getUTCDate()}, ${value.getUTCFullYear()}`;
}

function addMarkdown(doc: PDFKit.PDFDocument, markdown: string) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let codeLines: string[] | null = null;

  const renderCode = () => {
    if (!codeLines) return;
    const text = codeLines.join("\n") || " ";
    doc.font("Regular").fontSize(8.5);
    const height = doc.heightOfString(text, { width: width - 24, lineGap: 2 }) + 20;
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      doc.y = doc.page.margins.top;
    }
    const top = doc.y;
    doc.roundedRect(doc.page.margins.left, top, width, height, 5).fill(colors.code);
    doc.fillColor(colors.ink).text(text, doc.page.margins.left + 12, top + 10, { width: width - 24, lineGap: 2 });
    doc.y = top + height + 10;
    codeLines = null;
  };

  for (const rawLine of lines) {
    if (/^\s*```/.test(rawLine)) {
      if (codeLines) renderCode();
      else codeLines = [];
      continue;
    }
    if (codeLines) {
      codeLines.push(rawLine);
      continue;
    }

    const line = rawLine.trimEnd();
    if (!line.trim()) {
      doc.moveDown(0.45);
      continue;
    }
    if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      doc.moveDown(0.3).strokeColor(colors.border).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke().moveDown(0.6);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const sizes = [22, 17, 14, 12];
      doc.moveDown(level === 1 ? 0.8 : 0.55).font("Bold").fontSize(sizes[level - 1]).fillColor(level <= 2 ? colors.accent : colors.ink)
        .text(cleanInlineMarkdown(heading[2]), { width, lineGap: 2 }).moveDown(0.25);
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
    if (bullet || ordered) {
      const marker = ordered ? `${ordered[1]}.` : "•";
      const text = cleanInlineMarkdown((ordered ?? bullet)![ordered ? 2 : 1]);
      doc.font("Regular").fontSize(10).fillColor(colors.ink).text(`${marker}  ${text}`, { width: width - 12, indent: 10, lineGap: 3 }).moveDown(0.2);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const text = cleanInlineMarkdown(line.replace(/^\s*>\s?/, ""));
      const top = doc.y;
      doc.font("Regular").fontSize(10).fillColor(colors.muted).text(text, doc.page.margins.left + 14, top, { width: width - 14, lineGap: 4 });
      doc.strokeColor(colors.accent).lineWidth(2).moveTo(doc.page.margins.left + 4, top).lineTo(doc.page.margins.left + 4, doc.y).stroke().moveDown(0.3);
      continue;
    }

    doc.font("Regular").fontSize(10).fillColor(colors.ink).text(cleanInlineMarkdown(line), { width, lineGap: 4 }).moveDown(0.35);
  }
  renderCode();
}

export async function createWorkflowPdf(input: WorkflowPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 54, right: 54, bottom: 58, left: 54 }, bufferPages: true, info: { Title: input.title, Author: input.verifiedBy, Subject: input.description } });
  doc.registerFont("Regular", regularFont);
  doc.registerFont("Bold", boldFont);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const badgeTop = doc.y;
  doc.roundedRect(doc.page.margins.left, badgeTop, 118, 24, 12).fill(colors.accentSoft);
  doc.font("Bold").fontSize(8).fillColor(colors.accent).text("CODEFYHUB WORKFLOW", doc.page.margins.left + 12, badgeTop + 8, { characterSpacing: 0.7, lineBreak: false });
  doc.x = doc.page.margins.left;
  doc.y = badgeTop + 38;
  doc.font("Regular").fontSize(9).fillColor(colors.muted).text(input.sectionTitle.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveDown(0.65).font("Bold").fontSize(25).fillColor(colors.ink).text(input.title, { width: contentWidth, lineGap: 3 });
  doc.moveDown(0.7).font("Regular").fontSize(11).fillColor(colors.muted).text(input.description, { width: contentWidth, lineGap: 5 });
  doc.moveDown(1.1);
  const metaTop = doc.y;
  doc.roundedRect(doc.page.margins.left, metaTop, contentWidth, 48, 6).fill(colors.accentSoft);
  doc.font("Bold").fontSize(8).fillColor(colors.accent).text("VERIFIED", doc.page.margins.left + 14, metaTop + 10);
  doc.font("Regular").fontSize(9).fillColor(colors.ink).text(`${formatVerifiedDate(input.lastVerifiedAt)} by ${input.verifiedBy}`, doc.page.margins.left + 14, metaTop + 25, { width: contentWidth - 28 });
  doc.y = metaTop + 64;

  addMarkdown(doc, input.body);

  if (input.sources.length > 0) {
    doc.moveDown(0.8).font("Bold").fontSize(17).fillColor(colors.accent).text("Verified sources").moveDown(0.35);
    for (const source of input.sources) {
      doc.font("Bold").fontSize(9.5).fillColor(colors.ink).text(`${source.organization}: ${source.title}`, { lineGap: 2 });
      doc.font("Regular").fontSize(8.5).fillColor(colors.accent).text(source.url, { link: source.url, underline: true, lineGap: 2 });
      if (source.claimScope) doc.fillColor(colors.muted).text(source.claimScope, { lineGap: 2 });
      doc.moveDown(0.55);
    }
  }

  doc.moveDown(0.8).font("Bold").fontSize(12).fillColor(colors.ink).text("Verification method").moveDown(0.25);
  doc.font("Regular").fontSize(9).fillColor(colors.muted).text(input.verificationMethod, { lineGap: 3 });

  const range = doc.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const footerY = doc.page.height - 34;
    doc.strokeColor(colors.border).lineWidth(0.6).moveTo(doc.page.margins.left, footerY - 10).lineTo(doc.page.width - doc.page.margins.right, footerY - 10).stroke();
    doc.font("Regular").fontSize(7.5).fillColor(colors.muted).text("Codefyhub company knowledge", doc.page.margins.left, footerY, { lineBreak: false });
    const pageLabel = `Page ${pageIndex + 1} of ${range.count}`;
    doc.text(pageLabel, doc.page.margins.left, footerY, { width: contentWidth, align: "right" });
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
  return completed;
}
