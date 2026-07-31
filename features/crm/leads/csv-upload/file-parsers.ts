import {
  HEADER_ALIASES,
  VALID_SOURCES,
  VALID_PRIORITIES,
  type ParsedLead,
} from "./types";

export function matchHeader(header: string): string | null {
  const h = header.toLowerCase().trim().replace(/[_\-]/g, " ");
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(h)) return field;
  }
  return null;
}

export function getFileExtension(name: string): string {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function extractCSV(text: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((l) => parseCSVLine(l));
  return { headers, rows };
}

export async function extractExcel(buffer: ArrayBuffer): Promise<{
  headers: string[];
  rows: string[][];
}> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return { headers: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: string[][] = [];
  for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
    const row = sheet.getRow(rowIdx);
    const cols: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cols[colNumber - 1] = String(cell.value ?? "").trim();
    });
    if (!cols.every((c) => !c)) rows.push(cols);
  }
  return { headers, rows };
}

export function applyMapping(
  headers: string[],
  rows: string[][],
  fieldMappings: Record<number, string>,
): { leads: ParsedLead[]; errors: string[] } {
  const fieldToCol: Record<string, number> = {};
  for (const [idxStr, field] of Object.entries(fieldMappings)) {
    if (field !== "_skip") fieldToCol[field] = Number(idxStr);
  }

  const leads: ParsedLead[] = [];
  const errors: string[] = [];

  const get = (row: string[], field: string): string | undefined => {
    const idx = fieldToCol[field];
    return idx !== undefined ? row[idx]?.trim() || undefined : undefined;
  };

  rows.forEach((row, i) => {
    const name = get(row, "name");
    if (!name) {
      errors.push(`Row ${i + 2}: missing name, skipped.`);
      return;
    }

    const source = get(row, "source")?.toLowerCase();
    const priority = get(row, "priority")?.toUpperCase();

    leads.push({
      name,
      email: get(row, "email"),
      phone: get(row, "phone"),
      company: get(row, "company"),
      source:
        source && (VALID_SOURCES as readonly string[]).includes(source)
          ? source
          : undefined,
      notes: get(row, "notes"),
      city: get(row, "city"),
      designation: get(row, "designation"),
      referredBy: get(row, "referredBy"),
      potentialValue: get(row, "potentialValue"),
      investmentInterest: get(row, "investmentInterest"),
      whatsappNumber: get(row, "whatsappNumber"),
      website: get(row, "website"),
      priority:
        priority && (VALID_PRIORITIES as readonly string[]).includes(priority)
          ? priority
          : undefined,
      tags: get(row, "tags"),
    });
  });

  return { leads, errors };
}
