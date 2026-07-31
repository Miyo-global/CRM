import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  return withAdmin(async (session) => {
    const rows = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, session.orgId))
      .orderBy(auditLogs.action);

    return ok(rows.map((r) => r.action));
  });
}
