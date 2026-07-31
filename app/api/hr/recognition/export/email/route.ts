import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { withAuth, err, ok, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/constants/roles";
import {
  recognitionExportEmailSchema,
  recognitionExportFilename,
  buildRecognitionScopeLabel,
} from "@/lib/hr/recognition-export-filters";
import { buildRecognitionCsvBuffer } from "@/lib/hr/recognition-export-rows";
import { getRecognitionExportRows } from "@/server/queries/hr/recognition-export";
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
      return err("Only CEO, HR, or Admin can email recognition reports.", 403);
    }

    let body;
    try {
      body = await parseBody(req, recognitionExportEmailSchema);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid request", 400);
      return err("Invalid request body", 400);
    }

    const { to, cc, bcc, subject: customSubject, message, ...filters } = body;
    const isAdmin = isAdminOrOwner(session.user.role);

    const rows = await getRecognitionExportRows(session.orgId, filters, {
      isAdmin,
      currentUserId: session.user.id,
    });

    const scopeLabel = buildRecognitionScopeLabel(filters);
    const buffer = buildRecognitionCsvBuffer(rows);
    const rowCount = rows.length;

    const defaultSubject = `Recognition history – ${scopeLabel}`;
    const subject = (customSubject?.trim() || defaultSubject).slice(0, 200);
    const messageHtml = message?.trim()
      ? `<p>${escapeHtml(message.trim()).replace(/\n/g, "<br/>")}</p>`
      : `<p>Please find attached the recognition history for <strong>${escapeHtml(scopeLabel)}</strong>.</p>`;
    const summaryHtml = `<p style="color:#666;font-size:13px">Records: ${rowCount}</p>`;

    await sendEmail({
      to,
      subject,
      html: `
        ${messageHtml}
        ${summaryHtml}
        <p style="margin-top:16px;font-size:12px;color:#888">Sent from Miyo Global HR Recognition.</p>
      `,
      attachments: [
        {
          filename: recognitionExportFilename(),
          content: buffer,
          type: "text/csv",
        },
      ],
      ...(cc?.length ? { cc } : {}),
      ...(bcc?.length ? { bcc } : {}),
    });

    return ok({
      success: true,
      sentTo: to.length,
      records: rowCount,
    });
  });
}
