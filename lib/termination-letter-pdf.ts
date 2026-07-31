import "server-only";

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";


export interface TerminationLetterData {
  employeeName: string;
  employeeId?: string;
  designation: string;
  effectiveDate: string;
  reasons: string[];
  detailedExplanation?: string;
  hrName: string;
  hrDesignation?: string;
  companyName?: string;
}


const NAVY = rgb(0.059, 0.169, 0.498);
const GOLD = rgb(0.741, 0.533, 0.173);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.35, 0.35, 0.35);


function createDt(page: PDFPage) {
  return function dt(
    text: string,
    x: number, y: number,
    font: PDFFont, size: number,
    color: ReturnType<typeof rgb> = BLACK,
  ) {
    page.drawText(text, { x, y, size, font, color });
  };
}

function dtOnPage(
  page: PDFPage, text: string,
  x: number, y: number,
  font: PDFFont, size: number,
  color: ReturnType<typeof rgb> = BLACK,
) {
  page.drawText(text, { x, y, size, font, color });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}


let logoPngCache: Buffer | null = null;

async function getLogoPng(size: number): Promise<Buffer> {
  if (logoPngCache && size === 60) return logoPngCache;

  const svgPath = path.join(process.cwd(), "public", "logo.svg");
  const svgBuffer = await fs.readFile(svgPath);
  const pngBuffer = await sharp(svgBuffer)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  if (size === 60) logoPngCache = pngBuffer;
  return pngBuffer;
}


export async function generateTerminationLetterPdf(
  data: TerminationLetterData
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const { height } = page.getSize();
  const pageW = 595;
  const margin = 50;
  const contentW = pageW - margin * 2;
  const company = data.companyName ?? "MIYO GLOBAL";
  const dt = createDt(page);

  let y = height - margin;


  let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  let watermarkImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;

  try {
    const logoPng = await getLogoPng(60);
    logoImage = await doc.embedPng(logoPng);

    const watermarkPng = await sharp(
      await fs.readFile(path.join(process.cwd(), "public", "logo.svg"))
    )
      .resize(280, 280, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    watermarkImage = await doc.embedPng(watermarkPng);
  } catch {
  }


  if (watermarkImage) {
    const wmSize = 250;
    page.drawImage(watermarkImage, {
      x: (pageW - wmSize) / 2,
      y: (height - wmSize) / 2,
      width: wmSize,
      height: wmSize,
      opacity: 0.06,
    });
  }


  page.drawRectangle({ x: pageW * 0.5, y: y - 2, width: pageW * 0.5, height: 6, color: NAVY });

  if (logoImage) {
    const logoSize = 55;
    page.drawImage(logoImage, {
      x: margin,
      y: y - logoSize - 2,
      width: logoSize,
      height: logoSize,
    });
    dt("MIYO GLOBAL", margin + 62, y - 18, bold, 26, NAVY);
    dt("CAPITAL ADVISORS LLP", margin + 62, y - 38, regular, 11, NAVY);
  } else {
    page.drawRectangle({ x: margin, y: y - 52, width: 50, height: 50, color: GOLD });
    dt("V", margin + 14, y - 40, bold, 30, WHITE);
    dt("MIYO GLOBAL", margin + 60, y - 18, bold, 26, NAVY);
    dt("CAPITAL ADVISORS LLP", margin + 60, y - 38, regular, 11, NAVY);
  }

  y -= 78;


  const reasonSummary = data.reasons.length > 0
    ? summarizeReasonForTitle(data.reasons)
    : "Policy Violation";
  const title = `Termination of Employment Due to ${reasonSummary}:`;

  const titleLines = wrapText(title, bold, 12, contentW);
  for (const line of titleLines) {
    const tw = bold.widthOfTextAtSize(line, 12);
    const tx = (pageW - tw) / 2;
    dt(line, tx, y, bold, 12, BLACK);
    page.drawLine({ start: { x: tx, y: y - 3 }, end: { x: tx + tw, y: y - 3 }, thickness: 1, color: BLACK });
    y -= 18;
  }

  y -= 18;


  dt("Date:", margin, y, bold, 10, BLACK);
  dt(` ${data.effectiveDate}.`, margin + 30, y, regular, 10, BLACK);
  y -= 28;


  const toX = margin + 40;
  dt("To", toX, y, bold, 10, BLACK);
  y -= 16;
  dt(data.employeeName, margin, y, bold, 11, BLACK);
  y -= 15;
  if (data.employeeId) {
    dt(`Emp ID: ${data.employeeId}`, margin, y, bold, 10, BLACK);
    y -= 15;
  }
  dt(data.designation, toX, y, regular, 10, BLACK);
  y -= 26;


  dt(`Dear ${data.employeeName},`, margin, y, regular, 10, BLACK);
  y -= 22;


  const reasonText = data.reasons.length > 0
    ? data.reasons.join(", ").toLowerCase()
    : "violation of company policies and guidelines";

  const para1 = `This is to formally inform you that your employment with ${company} is terminated effective ${data.effectiveDate}, due to ${reasonText}.`;
  y = drawParagraph(page, para1, margin, y, regular, 10, contentW);
  y -= 6;


  const para2 = data.detailedExplanation
    ? data.detailedExplanation
    : "Despite prior discussions and warnings, there has been no satisfactory improvement in adherence to the company's rules and standards. As a result, management has taken this decision after careful consideration and in line with company policy.";
  y = drawParagraph(page, para2, margin, y, regular, 10, contentW);
  y -= 6;


  const para3 = "You are requested to hand over all company assets, documents, and responsibilities to Reporting Manager/HR on your last working day. Your full and final settlement will be processed by the end of the month as per company policy.";
  y = drawParagraphWithBold(page, para3, "Reporting Manager/HR", margin, y, regular, bold, 10, contentW);
  y -= 6;


  dt("We wish you the best in your future endeavours.", margin, y, regular, 10, BLACK);
  y -= 32;


  dt("Sincerely,", margin, y, regular, 10, BLACK);
  y -= 16;
  dt(data.hrName, margin, y, regular, 10, BLACK);
  y -= 14;
  dt(data.hrDesignation ?? "HR Executive", margin, y, regular, 10, BLACK);
  y -= 14;
  dt(company + ".", margin, y, regular, 10, BLACK);
  y -= 38;


  const sealX = pageW - margin - 65;
  const sealY = Math.max(y + 10, 80);
  const sealRadius = 35;

  page.drawCircle({ x: sealX, y: sealY, size: sealRadius, borderColor: NAVY, borderWidth: 2 });
  page.drawCircle({ x: sealX, y: sealY, size: sealRadius - 5, borderColor: NAVY, borderWidth: 0.8 });

  if (logoImage) {
    const sealLogoSize = 32;
    page.drawImage(logoImage, {
      x: sealX - sealLogoSize / 2,
      y: sealY - sealLogoSize / 2 + 2,
      width: sealLogoSize,
      height: sealLogoSize,
      opacity: 0.8,
    });
  } else {
    dt("MIYO GLOBAL", sealX - 22, sealY + 14, bold, 7, NAVY);
    dt("CAPITAL", sealX - 19, sealY + 4, bold, 7, NAVY);
    dt("ADVISORS", sealX - 22, sealY - 6, bold, 7, NAVY);
    dt("LLP", sealX - 8, sealY - 16, bold, 7, NAVY);
  }

  const hydW = regular.widthOfTextAtSize("Hyderabad", 7);
  dt("Hyderabad", sealX - hydW / 2, sealY - sealRadius - 10, regular, 7, NAVY);


  page.drawLine({ start: { x: margin, y: 42 }, end: { x: pageW - margin, y: 42 }, thickness: 0.5, color: GRAY });
  const footer = "This is a system-generated document from Miyo Global | hr@miyoglobal.com";
  const footerW = regular.widthOfTextAtSize(footer, 6.5);
  dt(footer, (pageW - footerW) / 2, 30, regular, 6.5, GRAY);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}


function drawParagraph(
  page: PDFPage, text: string,
  x: number, y: number,
  font: PDFFont, size: number, maxW: number,
): number {
  const lines = wrapText(text, font, size, maxW);
  for (const line of lines) {
    dtOnPage(page, line, x, y, font, size, BLACK);
    y -= 14;
  }
  return y;
}

function drawParagraphWithBold(
  page: PDFPage, text: string, boldPhrase: string,
  x: number, y: number,
  regularFont: PDFFont, boldFont: PDFFont,
  size: number, maxW: number,
): number {
  const lines = wrapText(text, regularFont, size, maxW);
  for (const line of lines) {
    const idx = line.indexOf(boldPhrase);
    if (idx >= 0) {
      const before = line.substring(0, idx);
      const after = line.substring(idx + boldPhrase.length);
      let xPos = x;
      if (before) {
        dtOnPage(page, before, xPos, y, regularFont, size, BLACK);
        xPos += regularFont.widthOfTextAtSize(before, size);
      }
      dtOnPage(page, boldPhrase, xPos, y, boldFont, size, BLACK);
      xPos += boldFont.widthOfTextAtSize(boldPhrase, size);
      if (after) {
        dtOnPage(page, after, xPos, y, regularFont, size, BLACK);
      }
    } else {
      dtOnPage(page, line, x, y, regularFont, size, BLACK);
    }
    y -= 14;
  }
  return y;
}

function summarizeReasonForTitle(reasons: string[]): string {
  if (reasons.length === 0) return "Policy Violation";
  const first = reasons[0];
  const titleMap: Record<string, string> = {
    "Poor performance": "Poor Performance",
    "Misconduct / violation of company policies": "Policy Violation",
    "Attendance issues / absenteeism": "Attendance Issues",
    "Behavioral issues": "Behavioral Issues",
    "Company restructuring / layoffs": "Restructuring",
    "Redundancy of role": "Role Redundancy",
    "Project closure": "Project Closure",
    "Failure to meet targets": "Performance Issues",
    "Breach of confidentiality": "Breach of Confidentiality",
    "Insubordination": "Insubordination",
  };
  return titleMap[first] ?? first.split("/")[0].trim();
}
