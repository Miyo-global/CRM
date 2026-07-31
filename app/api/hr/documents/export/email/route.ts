import { type NextRequest } from "next/server";
import { withAuth, err, ok, parseBody } from "@/lib/api/helpers";
import { getDocumentsForExport } from "@/server/queries/hr";
import { documentExportEmailSchema, formatDocumentExportLabel } from "@/lib/hr/documents-export-filters";
import { buildDocumentsZipBuffer } from "@/lib/hr/build-documents-zip";
import { sendEmail } from "@/lib/email/sender";
import { ZodError } from "zod";

function canSendDocumentPackEmail(role: string | null | undefined): boolean {
  return role === "CEO" || role === "HR" || role === "ADMIN";
}


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!canSendDocumentPackEmail(session.user.role)) {
      return err("Only CEO, HR, or Admin can email document exports.", 403);
    }

    let body;
    try {
      body = await parseBody(req, documentExportEmailSchema);
    } catch (e) {
      if (e instanceof ZodError) {
        return err(e.issues[0]?.message ?? "Invalid request", 400);
      }
      return err("Invalid request body", 400);
    }

    const isDocumentsAdmin =
      session.user.role === "CEO" || session.user.role === "HR" || session.user.role === "ADMIN";
    if (body.filterUserId && body.filterUserId !== session.user.id && !isDocumentsAdmin) {
      return err("Not authorized to export other users' documents.", 403);
    }

    const emails = [...new Set(body.to.map((e) => e.toLowerCase()))];
    if (emails.length === 0) {
      return err("At least one recipient is required.", 400);
    }

    const { to: _to, subject: _subj, message: _msg, cc: _cc, bcc: _bcc, ...filterOnly } = body;
    const docs = await getDocumentsForExport(session.orgId, session.user.id, isDocumentsAdmin, filterOnly);
    const { buffer, included, skipped } = await buildDocumentsZipBuffer(docs, { maxFiles: 100 });
    const label = formatDocumentExportLabel(filterOnly);
    const defaultSubject = `Document report – ${label}`;
    const subject = (body.subject?.trim() || defaultSubject).slice(0, 200);
    const messageHtml = body.message?.trim()
      ? `<p>${escapeHtml(body.message.trim()).replace(/\n/g, "<br/>")}</p>`
      : `<p>Please find attached a ZIP export of documents matching: <strong>${escapeHtml(label)}</strong>.</p>`;
    const summary = `<p style="color:#666;font-size:13px">Files included: ${included}${
      skipped ? ` · Skipped (unreadable): ${skipped}` : ""
    }</p>`;

    const cc = body.cc?.length ? [...new Set(body.cc.map((e) => e.toLowerCase()))] : [];
    const bcc = body.bcc?.length ? [...new Set(body.bcc.map((e) => e.toLowerCase()))] : [];
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `documents-export-${dateStamp}.zip`;

    await sendEmail({
      to: emails,
      subject,
      html: `
        ${messageHtml}
        ${summary}
        <p style="margin-top:16px;font-size:12px;color:#888">Sent from Miyo Global HR Documents.</p>
      `,
      attachments: [
        {
          filename,
          content: buffer,
          type: "application/zip",
        },
      ],
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
    });

    return ok({
      success: true,
      sentTo: emails.length,
      included,
      skipped,
    });
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
