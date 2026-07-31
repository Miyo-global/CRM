import ExcelJS from "exceljs";
import type { ExportResult } from "@/server/actions/expense-export";

type XlsxData = NonNullable<Extract<ExportResult, { format: "xlsx" }>["data"]>;

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function downloadXLSX(data: XlsxData, filename: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  data.sheets.forEach((sheet) => {
    const ws = workbook.addWorksheet(sheet.name);

    const colWidths =
      sheet.data[0]?.map((_, colIndex) => {
        const maxLength = Math.max(
          ...sheet.data.map((row) => String(row[colIndex] || "").length)
        );
        return Math.min(Math.max(maxLength, 10), 50);
      }) ?? [];

    ws.columns = colWidths.map((w) => ({ width: w }));

    for (const row of sheet.data) {
      ws.addRow(row);
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
