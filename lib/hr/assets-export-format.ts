import type { SheetDefinition } from "@/lib/export/xlsx-utils";

export interface AssetExportRow {
  name: string;
  type: string;
  serialNumber: string;
  status: string;
  assignedToName: string;
  purchaseCost: string;
  purchaseDate: string;
  notes: string;
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildAssetsCsvString(rows: AssetExportRow[]): string {
  const header = [
    "name",
    "type",
    "serialNumber",
    "status",
    "assignedToName",
    "purchaseCost",
    "purchaseDate",
    "notes",
  ];
  const lines = [header.join(",")];
  for (const a of rows) {
    lines.push(
      [
        csvEscape(a.name),
        csvEscape(a.type),
        csvEscape(a.serialNumber),
        csvEscape(a.status),
        csvEscape(a.assignedToName),
        csvEscape(a.purchaseCost),
        csvEscape(a.purchaseDate),
        csvEscape(a.notes),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

export function assetRowsToXlsxSheets(rows: AssetExportRow[]): SheetDefinition[] {
  return [
    {
      name: "Assets",
      columns: [
        { header: "Name", key: "name", width: 28 },
        { header: "Type", key: "type", width: 14 },
        { header: "Serial Number", key: "serialNumber", width: 22 },
        { header: "Status", key: "status", width: 14 },
        { header: "Assigned To", key: "assignedToName", width: 22 },
        { header: "Purchase Cost", key: "purchaseCost", width: 14 },
        { header: "Purchase Date", key: "purchaseDate", width: 14 },
        { header: "Notes", key: "notes", width: 36 },
      ],
      rows: rows.map((r) => ({ ...r })),
    },
  ];
}
