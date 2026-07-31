import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { dmLeads } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const byStatus = await db
      .select({ status: dmLeads.status, cnt: count() })
      .from(dmLeads)
      .where(eq(dmLeads.orgId, session.orgId))
      .groupBy(dmLeads.status);

    const byPlatformRows = await db
      .select({ platform: dmLeads.sourcePlatform, cnt: count() })
      .from(dmLeads)
      .where(eq(dmLeads.orgId, session.orgId))
      .groupBy(dmLeads.sourcePlatform);

    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r.cnt]));
    const total = byStatus.reduce((s, r) => s + r.cnt, 0);

    return ok({
      total,
      pendingReview: statusMap.pending_review ?? 0,
      verified: statusMap.verified ?? 0,
      sentToHr: statusMap.sent_to_hr ?? 0,
      imported: statusMap.imported_to_pipeline ?? 0,
      byPlatform: byPlatformRows.map((r) => ({ platform: r.platform, count: r.cnt })),
    });
  });
}
