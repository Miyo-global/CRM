import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { withRoles, err, ok, parseBody } from "@/lib/api/helpers";
import { BONUS_MANAGE_ROLES } from "@/lib/constants/hr";
import { bonusExportEmailSchema } from "@/lib/hr/bonus-export-email";
import { buildBonusScopeLabel } from "@/lib/hr/bonus-filters";
import { buildBonusCsvBuffer } from "@/lib/hr/bonus-export";
import { getBonusExportRows } from "@/server/queries/hr/bonuses-export";
import { sendEmail } from "@/lib/email/sender";
import { format } from "date-fns";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  return withRoles(BONUS_MANAGE_ROLES)(async (session) => {
    let body;
    try {
      body = await parseBody(req, bonusExportEmailSchema);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid request", 400);
      return err("Invalid request body", 400);
    }

    const { to, cc, bcc, subject: customSubject, message, ...filters } = body;
    const rows = await getBonusExportRows(session.orgId, filters);
    const scopeLabel = buildBonusScopeLabel({
      search: filters.search ?? "",
      status: filters.status ?? "ALL",
      type: filters.type ?? "ALL",
      userId: filters.userId ?? "ALL",
      dateFrom: filters.dateFrom ?? "",
      dateTo: filters.dateTo ?? "",
    });

    const buffer = buildBonusCsvBuffer(rows);
    const defaultSubject = `Bonus report – ${scopeLabel}`;
    const subject = (customSubject?.trim() || defaultSubject).slice(0, 200);
    const messageHtml = message?.trim()
      ? `<p>${escapeHtml(message.trim()).replace(/\n/g, "<br/>")}</p>`
      : `<p>Please find attached the bonus report for <strong>${escapeHtml(scopeLabel)}</strong>.</p>`;

    await sendEmail({
      to,
      subject,
      html: `
        ${messageHtml}
        <p style="color:#666;font-size:13px">Records: ${rows.length}</p>
        <p style="margin-top:16px;font-size:12px;color:#888">Sent from Miyo Global HR Bonuses.</p>
      `,
      attachments: [
        {
          filename: `bonuses-${format(new Date(), "yyyy-MM-dd")}.csv`,
          content: buffer,
          type: "text/csv",
        },
      ],
      ...(cc?.length ? { cc } : {}),
      ...(bcc?.length ? { bcc } : {}),
    });

    return ok({ success: true, sentTo: to.length, records: rows.length });
  });
}
