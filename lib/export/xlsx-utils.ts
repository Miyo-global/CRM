import ExcelJS from "exceljs";

export interface SheetDefinition {
  name: string;
  columns: Array<{ header: string; key: string; width?: number }>;
  rows: Array<Record<string, unknown>>;
}

export async function buildXlsxBuffer(sheets: SheetDefinition[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    ws.columns = sheet.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width ?? 20,
    }));
    ws.addRows(sheet.rows);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function downloadXlsx(filename: string, sheets: SheetDefinition[]): Promise<void> {
  const ExcelJSModule = (await import("exceljs")).default;
  const workbook = new ExcelJSModule.Workbook();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    ws.columns = sheet.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width ?? 20,
    }));
    ws.addRows(sheet.rows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** One sheet as CSV text, with quotes doubled and separators quoted. */
export function sheetToCsv(sheet: SheetDefinition): string {
  const escape = (value: unknown): string => {
    if (value == null) return "";
    const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = sheet.columns.map((c) => escape(c.header)).join(",");
  const lines = sheet.rows.map((row) =>
    sheet.columns.map((c) => escape(row[c.key])).join(","),
  );
  return [header, ...lines].join("\n");
}

/**
 * Downloads the sheets as CSV.
 *
 * Exports offered xlsx only in some places and CSV in others, sometimes with
 * the wrong extension for the bytes (QA-D002). Several sheets are separated by
 * a titled blank line, since CSV has no concept of sheets.
 */
export function downloadCsv(filename: string, sheets: SheetDefinition[]): void {
  const body =
    sheets.length === 1
      ? sheetToCsv(sheets[0])
      : sheets.map((s) => `${s.name}\n${sheetToCsv(s)}`).join("\n\n");

  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Swaps a filename's extension, so one base name serves both formats. */
export function withExtension(filename: string, extension: "xlsx" | "csv"): string {
  return `${filename.replace(/\.(xlsx|csv)$/i, "")}.${extension}`;
}
