import { withRoles, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance, departments, leaveRequests, leaveTypes, organizationMembers, payrolls, users } from "@/lib/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { buildTablePdf, type TablePdfColumn } from "@/lib/export/table-pdf";
import { buildXlsxBuffer } from "@/lib/export/xlsx-utils";
import { formatCalendarDate, getTodayString } from "@/lib/date-utils";
import { NextResponse, type NextRequest } from "next/server";

/**
 * HR reports as a real file download (QA-0029).
 *
 * The /reports page used to hold sales placeholders whose PDF buttons did
 * nothing and whose XLSX contained sample rows. Each report here is built from
 * live data and served as a genuine .xlsx or .pdf.
 */

interface ReportData {
  title: string;
  columns: TablePdfColumn[];
  keys: string[];
  rows: Record<string, string | number>[];
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

async function headcountReport(orgId: string): Promise<ReportData> {
  const rows = await db
    .select({
      name: users.name,
      employeeId: users.employeeId,
      designation: users.designation,
      department: sql<string>`COALESCE(${departments.name}, 'Unassigned')`,
      role: organizationMembers.role,
      joiningDate: users.joiningDate,
      isActive: users.isActive,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(organizationMembers.orgId, orgId))
    .orderBy(users.name);

  return {
    title: "Headcount",
    columns: [
      { header: "Employee", width: 150 },
      { header: "Employee ID", width: 90 },
      { header: "Designation", width: 150 },
      { header: "Department", width: 110 },
      { header: "System role", width: 110 },
      { header: "Joined", width: 90 },
      { header: "Status", width: 70 },
    ],
    keys: ["name", "employeeId", "designation", "department", "role", "joined", "status"],
    rows: rows.map((r) => ({
      name: r.name ?? "",
      employeeId: r.employeeId ?? "",
      designation: r.designation ?? "",
      department: r.department,
      role: r.role,
      joined: formatCalendarDate(r.joiningDate),
      status: r.isActive === false ? "Inactive" : "Active",
    })),
  };
}

async function attendanceReport(orgId: string, month: string): Promise<ReportData> {
  const { start, end } = monthRange(month);
  const rows = await db
    .select({
      name: users.name,
      present: sql<number>`SUM(CASE WHEN ${attendance.status} IN ('PRESENT','LATE') THEN 1 ELSE 0 END)`.mapWith(Number),
      late: sql<number>`SUM(CASE WHEN ${attendance.status} = 'LATE' THEN 1 ELSE 0 END)`.mapWith(Number),
      absent: sql<number>`SUM(CASE WHEN ${attendance.status} = 'ABSENT' THEN 1 ELSE 0 END)`.mapWith(Number),
      hours: sql<string>`COALESCE(SUM(${attendance.workHours}::numeric), 0)`,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.userId, users.id))
    .where(and(eq(attendance.orgId, orgId), gte(attendance.date, start), lte(attendance.date, end)))
    .groupBy(users.name)
    .orderBy(users.name);

  return {
    title: `Attendance summary — ${month}`,
    columns: [
      { header: "Employee", width: 180 },
      { header: "Present", width: 80, align: "right" },
      { header: "Late", width: 80, align: "right" },
      { header: "Absent", width: 80, align: "right" },
      { header: "Hours", width: 90, align: "right" },
    ],
    keys: ["name", "present", "late", "absent", "hours"],
    rows: rows.map((r) => ({
      name: r.name ?? "",
      present: r.present,
      late: r.late,
      absent: r.absent,
      hours: Number(r.hours).toFixed(2),
    })),
  };
}

async function leaveReport(orgId: string, month: string): Promise<ReportData> {
  const { start, end } = monthRange(month);
  const rows = await db
    .select({
      name: users.name,
      leaveType: leaveTypes.name,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      status: leaveRequests.status,
      lopDays: leaveRequests.lopDays,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(
      and(
        eq(leaveRequests.orgId, orgId),
        gte(leaveRequests.startDate, start),
        lte(leaveRequests.startDate, end),
      ),
    )
    .orderBy(desc(leaveRequests.startDate));

  return {
    title: `Leave register — ${month}`,
    columns: [
      { header: "Employee", width: 160 },
      { header: "Leave type", width: 110 },
      { header: "From", width: 90 },
      { header: "To", width: 90 },
      { header: "Status", width: 90 },
      { header: "LOP days", width: 80, align: "right" },
    ],
    keys: ["name", "leaveType", "from", "to", "status", "lopDays"],
    rows: rows.map((r) => ({
      name: r.name ?? "",
      leaveType: r.leaveType ?? "Leave",
      from: formatCalendarDate(r.startDate),
      to: formatCalendarDate(r.endDate),
      status: r.status ?? "",
      lopDays: Number(r.lopDays ?? 0),
    })),
  };
}

async function payrollReport(orgId: string, month: string): Promise<ReportData> {
  const rows = await db
    .select({
      name: users.name,
      status: payrolls.status,
      gross: payrolls.grossSalary,
      lopDays: payrolls.lopDays,
      pt: payrolls.ptAmount,
      net: payrolls.netSalary,
    })
    .from(payrolls)
    .innerJoin(users, eq(payrolls.userId, users.id))
    .where(and(eq(payrolls.orgId, orgId), eq(payrolls.month, month)))
    .orderBy(users.name);

  return {
    title: `Payroll summary — ${month}`,
    columns: [
      { header: "Employee", width: 170 },
      { header: "Status", width: 90 },
      { header: "Gross", width: 90, align: "right" },
      { header: "LOP days", width: 80, align: "right" },
      { header: "Prof. tax", width: 80, align: "right" },
      { header: "Net payable", width: 100, align: "right" },
    ],
    keys: ["name", "status", "gross", "lopDays", "pt", "net"],
    rows: rows.map((r) => ({
      name: r.name ?? "",
      status: r.status ?? "",
      gross: Number(r.gross ?? 0).toFixed(2),
      lopDays: Number(r.lopDays ?? 0),
      pt: Number(r.pt ?? 0).toFixed(2),
      net: Number(r.net ?? 0).toFixed(2),
    })),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  return withRoles(ADMIN_ROLES)(async (session) => {
    const { reportId } = await params;
    const format = (req.nextUrl.searchParams.get("format") ?? "xlsx").toLowerCase();
    if (format !== "xlsx" && format !== "pdf") {
      return err("Format must be xlsx or pdf.", 400);
    }

    const monthParam = req.nextUrl.searchParams.get("month");
    const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
      ? monthParam!
      : new Date().toISOString().slice(0, 7);

    let report: ReportData;
    switch (reportId) {
      case "headcount":
        report = await headcountReport(session.orgId);
        break;
      case "attendance-summary":
        report = await attendanceReport(session.orgId, month);
        break;
      case "leave-register":
        report = await leaveReport(session.orgId, month);
        break;
      case "payroll-summary":
        report = await payrollReport(session.orgId, month);
        break;
      default:
        return err("Unknown report.", 404);
    }

    const stamp = getTodayString();
    const filename = `${reportId}-${stamp}.${format}`;

    if (format === "xlsx") {
      const buffer = await buildXlsxBuffer([
        {
          name: report.title.slice(0, 31),
          columns: report.columns.map((c, i) => ({
            header: c.header,
            key: report.keys[i],
            width: Math.round(c.width / 7),
          })),
          rows: report.rows,
        },
      ]);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const pdf = await buildTablePdf({
      title: report.title,
      subtitle: `Generated ${stamp}`,
      columns: report.columns,
      rows: report.rows.map((row) => report.keys.map((k) => row[k])),
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }, req);
}
