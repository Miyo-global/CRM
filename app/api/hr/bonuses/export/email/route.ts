import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { withRoles, err, ok, parseBody } from "@/lib/api/helpers";
import { BONUS_MANAGE_ROLES } from "@/lib/constants/hr";
import { bonusExportEmailSchema } from "@/lib/hr/bonus-export-email";
import { buildBonusScopeLabel } from "@/lib/hr/bonus-filters";
import { buildBonusCsvBuffer } from "@/lib/hr/bonus-export";
import { getBonusExportRows } from "@/server/queries/hr/bonuses-export";
import { sendDataExportEmail } from "@/lib/hr/send-export-email";
import { format } from "date-fns";

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
    await sendDataExportEmail({
      to,
      ...(cc?.length ? { cc } : {}),
      ...(bcc?.length ? { bcc } : {}),
      exportName: `bonus report for ${scopeLabel}`,
      rowCount: rows.length,
      fileType: "CSV",
      message,
      subject: customSubject || `Bonus report – ${scopeLabel}`,
      attachments: [
        {
          filename: `bonuses-${format(new Date(), "yyyy-MM-dd")}.csv`,
          content: buffer,
          type: "text/csv",
        },
      ],
    });

    return ok({ success: true, sentTo: to.length, records: rows.length });
  });
}
