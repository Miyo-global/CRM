import { format } from "date-fns";
import type { SheetDefinition } from "@/lib/export/xlsx-utils";
import { BONUS_TYPE_LABELS, type BonusType } from "@/lib/validations/bonus";
import type { BonusRow } from "@/lib/hr/bonus-filters";

export interface BonusExportRow {
  employee: string;
  type: string;
  amount: string;
  status: string;
  reason: string;
  createdAt: string;
}

export function mapBonusExportRows(bonuses: BonusRow[]): BonusExportRow[] {
  return bonuses.map((bonus) => ({
    employee: bonus.employeeName ?? "—",
    type: bonus.type ? (BONUS_TYPE_LABELS[bonus.type as BonusType] ?? bonus.type) : "—",
    amount: bonus.amount,
    status: bonus.status ?? "PENDING",
    reason: bonus.reason ?? "",
    createdAt: bonus.createdAt
      ? format(new Date(bonus.createdAt), "dd MMM yyyy")
      : "",
  }));
}

export function buildBonusXlsxSheets(bonuses: BonusRow[]): SheetDefinition[] {
  const rows = mapBonusExportRows(bonuses);
  return [
    {
      name: "Bonuses",
      columns: [
        { header: "Employee", key: "employee", width: 28 },
        { header: "Type", key: "type", width: 16 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Status", key: "status", width: 12 },
        { header: "Reason", key: "reason", width: 32 },
        { header: "Created", key: "createdAt", width: 14 },
      ],
      rows: rows.map((row) => ({ ...row })) as Array<Record<string, unknown>>,
    },
  ];
}

export function buildBonusCsvText(bonuses: BonusRow[]): string {
  const rows = mapBonusExportRows(bonuses);
  const headers = ["Employee", "Type", "Amount", "Status", "Reason", "Created"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [row.employee, row.type, row.amount, row.status, row.reason, row.createdAt]
        .map(escape)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export function buildBonusCsvBuffer(bonuses: BonusRow[]): Buffer {
  return Buffer.from(buildBonusCsvText(bonuses), "utf-8");
}
