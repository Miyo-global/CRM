import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { BRAND } from "@/lib/design/brand-hex";

const hexRgb = (hex: string) =>
  rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );

export interface TablePdfColumn {
  header: string;
  /** Column width in points. */
  width: number;
  align?: "left" | "right";
}

export interface TablePdfInput {
  title: string;
  subtitle?: string;
  columns: TablePdfColumn[];
  rows: (string | number | null | undefined)[][];
}

const PAGE = { width: 842, height: 595 }; // A4 landscape
const MARGIN = 36;
const ROW_HEIGHT = 18;

/**
 * Renders a report table as a real PDF (QA-0029).
 *
 * The report PDF buttons used to produce nothing at all; this is the one
 * generator they go through, so every report downloads an actual
 * application/pdf file with the same header and table styling.
 */
export async function buildTablePdf(input: TablePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = hexRgb(BRAND.ink);
  const muted = hexRgb(BRAND.inkMuted);
  const border = hexRgb(BRAND.border);
  const gold = hexRgb(BRAND.gold);

  const totalWidth = input.columns.reduce((sum, c) => sum + c.width, 0);
  const scale = Math.min(1, (PAGE.width - MARGIN * 2) / totalWidth);
  const widths = input.columns.map((c) => c.width * scale);

  let page = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;

  const drawHeader = () => {
    page.drawText(input.title, { x: MARGIN, y: y - 14, size: 14, font: bold, color: ink });
    if (input.subtitle) {
      page.drawText(input.subtitle, { x: MARGIN, y: y - 30, size: 9, font: regular, color: muted });
    }
    y -= input.subtitle ? 44 : 30;
    page.drawRectangle({
      x: MARGIN,
      y,
      width: PAGE.width - MARGIN * 2,
      height: 2,
      color: gold,
    });
    y -= 16;

    let x = MARGIN;
    input.columns.forEach((col, i) => {
      page.drawText(col.header, { x: x + 2, y, size: 9, font: bold, color: ink });
      x += widths[i];
    });
    y -= 6;
    page.drawRectangle({ x: MARGIN, y, width: PAGE.width - MARGIN * 2, height: 0.75, color: border });
    y -= ROW_HEIGHT;
  };

  drawHeader();

  for (const row of input.rows) {
    if (y < MARGIN + ROW_HEIGHT) {
      page = doc.addPage([PAGE.width, PAGE.height]);
      y = PAGE.height - MARGIN;
      drawHeader();
    }
    let x = MARGIN;
    input.columns.forEach((col, i) => {
      const text = row[i] == null ? "" : String(row[i]);
      const size = 9;
      const width = regular.widthOfTextAtSize(text, size);
      const available = widths[i] - 6;
      let shown = text;
      if (width > available) {
        // Trim to fit instead of overlapping the next column.
        let cut = text;
        while (cut.length > 1 && regular.widthOfTextAtSize(`${cut}…`, size) > available) {
          cut = cut.slice(0, -1);
        }
        shown = `${cut}…`;
      }
      const textWidth = regular.widthOfTextAtSize(shown, size);
      const tx = col.align === "right" ? x + widths[i] - textWidth - 3 : x + 2;
      page.drawText(shown, { x: tx, y, size, font: regular, color: muted });
      x += widths[i];
    });
    y -= ROW_HEIGHT;
  }

  if (input.rows.length === 0) {
    page.drawText("No data for this period.", { x: MARGIN, y, size: 10, font: regular, color: muted });
  }

  return doc.save();
}
