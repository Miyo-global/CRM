import ExcelJS from "exceljs";
import type { AttendanceExportRow } from "@/server/queries/hr/attendance-export";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/constants/locale";

export interface AttendanceXlsxMeta {
  orgName: string;
  scopeLabel: string;
  rangeLabel: string;
}

const HEADER_FILL = "FF111827";

function fmtTime(value: Date | string | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function toHours(value: string | null): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  row.alignment = { vertical: "middle" };
}

export async function buildAttendanceXlsxBuffer(
  rows: AttendanceExportRow[],
  meta: AttendanceXlsxMeta,
): Promise<{ buffer: Buffer; rowCount: number }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Miyo Global CRM";

  const detail = wb.addWorksheet("Attendance");
  // Department is placed first — before employee details — per reporting requirements.
  detail.columns = [
    { header: "Department", key: "departmentName", width: 22 },
    { header: "Employee", key: "employeeName", width: 26 },
    { header: "Emp ID", key: "employeeId", width: 10 },
    { header: "Role", key: "role", width: 18 },
    { header: "Date", key: "date", width: 12 },
    { header: "Attendance Status", key: "status", width: 18 },
    { header: "Check In (IST)", key: "checkIn", width: 14 },
    { header: "Check Out (IST)", key: "checkOut", width: 14 },
    { header: "Work Hours", key: "workHours", width: 12 },
    { header: "Break Hours", key: "breakHours", width: 12 },
    { header: "Overtime", key: "overtime", width: 10 },
    { header: "Holiday Work", key: "holidayWork", width: 13 },
    { header: "Sunday Work", key: "sundayWork", width: 12 },
    { header: "Auto Checkout", key: "autoCheckout", width: 14 },
  ];
  styleHeaderRow(detail.getRow(1));

  for (const r of rows) {
    detail.addRow({
      departmentName: r.departmentName ?? "",
      employeeName: r.employeeName,
      employeeId: r.employeeId ?? "",
      role: r.role,
      date: r.date,
      status: r.status ?? "ABSENT",
      checkIn: fmtTime(r.checkIn),
      checkOut: fmtTime(r.checkOut),
      workHours: toHours(r.workHours),
      breakHours: toHours(r.breakHours),
      overtime: r.isOvertime ? "Yes" : "",
      holidayWork: r.isHolidayWork ? "Yes" : "",
      sundayWork: r.isSundayWork ? "Yes" : "",
      autoCheckout: r.autoCheckedOut ? "Yes" : "",
    });
  }
  detail.views = [{ state: "frozen", ySplit: 1 }];
  detail.autoFilter = { from: "A1", to: "N1" };

  const summary = wb.addWorksheet("Summary");
  // Department first in summary as well
  const summaryWidths = [22, 26, 10, 14, 16, 14, 18];
  summaryWidths.forEach((w, i) => {
    summary.getColumn(i + 1).width = w;
  });
  summary.getCell("A1").value = meta.orgName;
  summary.getCell("A1").font = { bold: true, size: 14 };
  summary.getCell("A2").value = `Scope: ${meta.scopeLabel}`;
  summary.getCell("A3").value = `Period: ${meta.rangeLabel}`;
  summary.getCell("A4").value = `Records: ${rows.length}`;

  const headerRowIndex = 6;
  summary.getRow(headerRowIndex).values = [
    "Department",
    "Employee",
    "Emp ID",
    "Days Present",
    "Total Work Hours",
    "Overtime Days",
    "Auto-Checkout Days",
  ];
  styleHeaderRow(summary.getRow(headerRowIndex));

  const byEmployee = new Map<
    string,
    {
      employeeName: string;
      employeeId: string | null;
      departmentName: string | null;
      dates: Set<string>;
      totalHours: number;
      overtimeDays: number;
      autoCheckoutDays: number;
    }
  >();
  for (const r of rows) {
    const key = `${r.employeeName}__${r.employeeId ?? ""}`;
    const acc =
      byEmployee.get(key) ??
      {
        employeeName: r.employeeName,
        employeeId: r.employeeId,
        departmentName: r.departmentName,
        dates: new Set<string>(),
        totalHours: 0,
        overtimeDays: 0,
        autoCheckoutDays: 0,
      };
    acc.dates.add(r.date);
    acc.totalHours += toHours(r.workHours);
    if (r.isOvertime) acc.overtimeDays += 1;
    if (r.autoCheckedOut) acc.autoCheckoutDays += 1;
    byEmployee.set(key, acc);
  }

  const sortedAccs = Array.from(byEmployee.values()).sort((a, b) => {
    const deptA = (a.departmentName ?? "").toLowerCase();
    const deptB = (b.departmentName ?? "").toLowerCase();
    if (deptA !== deptB) return deptA.localeCompare(deptB);
    return a.employeeName.toLowerCase().localeCompare(b.employeeName.toLowerCase());
  });

  for (const acc of sortedAccs) {
    summary.addRow([
      acc.departmentName ?? "",
      acc.employeeName,
      acc.employeeId ?? "",
      acc.dates.size,
      Math.round(acc.totalHours * 100) / 100,
      acc.overtimeDays,
      acc.autoCheckoutDays,
    ]);
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(arrayBuffer), rowCount: rows.length };
}
