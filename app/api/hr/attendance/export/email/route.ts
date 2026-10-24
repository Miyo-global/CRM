import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { withAuth, err, ok, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/constants/roles";
import {
  attendanceExportEmailSchema,
  attendanceExportFilename,
  attendanceRangeLabel,
  buildAttendanceScopeLabel,
} from "@/lib/hr/attendance-export-filters";
import {
  getAttendanceExportRows,
  getOrganizationName,
} from "@/server/queries/hr/attendance-export";
import { buildAttendanceXlsxBuffer } from "@/lib/hr/build-attendance-xlsx";
import { sendDataExportEmail } from "@/lib/hr/send-export-email";

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only the Super Admin, HR or Admin can email attendance reports.", 403);
    }

    let body;
    try {
      body = await parseBody(req, attendanceExportEmailSchema);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid request", 400);
      return err("Invalid request body", 400);
    }

    const to = body.to;
    const cc = body.cc ?? [];
    const bcc = body.bcc ?? [];

    const filters = {
      userIds: body.userIds,
      departmentIds: body.departmentIds,
      startDate: body.startDate,
      endDate: body.endDate,
    };

    const [rows, orgName] = await Promise.all([
      getAttendanceExportRows(session.orgId, filters),
      getOrganizationName(session.orgId),
    ]);

    const scopeLabel = buildAttendanceScopeLabel(filters, rows);
    const rangeLabel = attendanceRangeLabel(filters.startDate, filters.endDate);
    const { buffer, rowCount } = await buildAttendanceXlsxBuffer(rows, {
      orgName,
      scopeLabel,
      rangeLabel,
    });

    const filename = attendanceExportFilename(filters.startDate, filters.endDate);

    await sendDataExportEmail({
      to,
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
      exportName: `attendance report for ${scopeLabel} (${rangeLabel})`,
      rowCount,
      fileType: "XLSX",
      message: body.message,
      subject: body.subject || `Attendance report – ${scopeLabel} (${rangeLabel})`,
      attachments: [
        {
          filename,
          content: buffer,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return ok({
      success: true,
      sentTo: to.length,
      records: rowCount,
    });
  });
}
