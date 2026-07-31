import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  return withAdmin(async (session) => {
    const rows = await db
      .selectDistinct({ targetType: auditLogs.targetType })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, session.orgId))
      .orderBy(auditLogs.targetType);

    return ok(rows.filter((r) => r.targetType !== null).map((r) => r.targetType as string));
  });
}
