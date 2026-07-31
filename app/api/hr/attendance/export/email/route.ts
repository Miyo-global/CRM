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
import { sendEmail } from "@/lib/email/sender";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only CEO, HR, or Admin can email attendance reports.", 403);
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

    const defaultSubject = `Attendance report – ${scopeLabel} (${rangeLabel})`;
    const subject = (body.subject?.trim() || defaultSubject).slice(0, 200);
    const messageHtml = body.message?.trim()
      ? `<p>${escapeHtml(body.message.trim()).replace(/\n/g, "<br/>")}</p>`
      : `<p>Please find attached the attendance report for <strong>${escapeHtml(scopeLabel)}</strong>.</p>`;
    const summaryHtml = `<p style="color:#666;font-size:13px">Period: ${escapeHtml(
      rangeLabel,
    )} · Records: ${rowCount}</p>`;

    const filename = attendanceExportFilename(filters.startDate, filters.endDate);

    await sendEmail({
      to,
      subject,
      html: `
        ${messageHtml}
        ${summaryHtml}
        <p style="margin-top:16px;font-size:12px;color:#888">Sent from Miyo Global HR Attendance.</p>
      `,
      attachments: [
        {
          filename,
          content: buffer,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
    });

    return ok({
      success: true,
      sentTo: to.length,
      records: rowCount,
    });
  });
}
