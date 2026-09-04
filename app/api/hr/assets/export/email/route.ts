import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { withAuth, err, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAssetExportRows } from "@/server/queries/hr/assets-export";
import { buildAssetsCsvString, assetRowsToXlsxSheets } from "@/lib/hr/assets-export-format";
import { buildXlsxBuffer } from "@/lib/export/xlsx-utils";
import { sendEmail } from "@/lib/email/sender";
import { isEmailConfigured, emailNotConfiguredMessage } from "@/lib/email/config";
import { assetsExportEmailSchema, assetsStatusLabel } from "@/lib/hr/assets-export-filters";
import { logger } from "@/lib/logger";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isEmailConfigured()) {
      return err(emailNotConfiguredMessage(), 400);
    }

    let body;
    try {
      body = await parseBody(req, assetsExportEmailSchema);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid request", 400);
      return err("Invalid request body", 400);
    }

    const { to, cc, bcc, format, status, subject: customSubject, message } = body;
    const rows = await getAssetExportRows(session.orgId, status);
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.orgId),
      columns: { name: true },
    });
    const orgName = org?.name ?? "Organization";
    const scopeLabel = assetsStatusLabel(status);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename =
      format === "csv"
        ? `assets-export-${dateStr}${status ? `-${status}` : ""}.csv`
        : `assets-export-${dateStr}${status ? `-${status}` : ""}.xlsx`;

    let attachment: { filename: string; content: Buffer; type: string };
    if (format === "csv") {
      attachment = {
        filename,
        content: Buffer.from(buildAssetsCsvString(rows), "utf-8"),
        type: "text/csv",
      };
    } else {
      attachment = {
        filename,
        content: await buildXlsxBuffer(assetRowsToXlsxSheets(rows)),
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }

    const defaultSubject = `${orgName} — Assets export (${scopeLabel})`;
    const subject = (customSubject?.trim() || defaultSubject).slice(0, 200);
    const messageHtml = message?.trim()
      ? `<p>${escapeHtml(message.trim()).replace(/\n/g, "<br/>")}</p>`
      : `<p>Please find attached the <strong>assets inventory</strong> export for <strong>${escapeHtml(orgName)}</strong> (${escapeHtml(scopeLabel)}).</p>`;
    const summaryHtml = `<p style="color:#666;font-size:13px">Rows: ${rows.length} · Format: ${format.toUpperCase()}</p>`;

    try {
      await sendEmail({
        to,
        subject,
        html: `
          ${messageHtml}
          ${summaryHtml}
          <p style="margin-top:16px;font-size:12px;color:#888">Sent from Miyo Global CRM — Assets.</p>
        `,
        attachments: [attachment],
        ...(cc?.length ? { cc } : {}),
        ...(bcc?.length ? { bcc } : {}),
      });
      return ok({
        sent: true,
        sentTo: to.length,
        rowCount: rows.length,
        format,
      });
    } catch (e) {
      logger.error("Failed to send asset export email", e);
      return err("Failed to send email. Please try again.", 502);
    }
  });
}
