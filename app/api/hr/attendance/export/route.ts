import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { withAuth, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/constants/roles";
import {
  attendanceExportFiltersSchema,
  attendanceExportFilename,
  attendanceRangeLabel,
  buildAttendanceScopeLabel,
} from "@/lib/hr/attendance-export-filters";
import {
  getAttendanceExportRows,
  getOrganizationName,
} from "@/server/queries/hr/attendance-export";
import { buildAttendanceXlsxBuffer } from "@/lib/hr/build-attendance-xlsx";

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only CEO, HR, or Admin can export attendance.", 403);
    }

    let filters;
    try {
      filters = await parseBody(req, attendanceExportFiltersSchema);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid filters", 400);
      return err("Invalid filters", 400);
    }

    const [rows, orgName] = await Promise.all([
      getAttendanceExportRows(session.orgId, filters),
      getOrganizationName(session.orgId),
    ]);

    const { buffer, rowCount } = await buildAttendanceXlsxBuffer(rows, {
      orgName,
      scopeLabel: buildAttendanceScopeLabel(filters, rows),
      rangeLabel: attendanceRangeLabel(filters.startDate, filters.endDate),
    });

    const filename = attendanceExportFilename(filters.startDate, filters.endDate);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Attendance-Export-Count": String(rowCount),
      },
    });
  });
}
