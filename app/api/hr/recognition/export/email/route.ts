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
import { sendDataExportEmail } from "@/lib/hr/send-export-email";


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

    await sendDataExportEmail({
      to,
      ...(cc?.length ? { cc } : {}),
      ...(bcc?.length ? { bcc } : {}),
      exportName: `recognition history for ${scopeLabel}`,
      rowCount,
      fileType: "CSV",
      message,
      subject: customSubject || `Recognition history – ${scopeLabel}`,
      attachments: [
        {
          filename: recognitionExportFilename(),
          content: buffer,
          type: "text/csv",
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
