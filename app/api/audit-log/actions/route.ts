import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ALWAYS_LISTED_AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET() {
  return withAdmin(async (session) => {
    const rows = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, session.orgId))
      .orderBy(auditLogs.action);

    // R3-ADM-12: tracked actions show in the filter before their first event.
    const actions = new Set<string>([...rows.map((r) => r.action), ...ALWAYS_LISTED_AUDIT_ACTIONS]);
    return ok([...actions].sort());
  });
}
