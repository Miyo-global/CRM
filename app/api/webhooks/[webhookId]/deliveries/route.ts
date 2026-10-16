import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { webhookEndpoints, webhookLogs } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Recent delivery attempts, so a dead endpoint is visible in the UI (QA-0054). */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ webhookId: string }> },
) {
  const { webhookId: raw } = await ctx.params;
  const webhookId = Number(raw);
  if (!Number.isFinite(webhookId)) return err("Invalid webhook id", 400);

  return withAdmin(async (session) => {
    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(eq(webhookEndpoints.id, webhookId), eq(webhookEndpoints.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!endpoint) return err("Webhook endpoint not found", 404);

    const logs = await db
      .select({
        id: webhookLogs.id,
        event: webhookLogs.event,
        statusCode: webhookLogs.statusCode,
        success: webhookLogs.success,
        responseBody: webhookLogs.responseBody,
        createdAt: webhookLogs.createdAt,
      })
      .from(webhookLogs)
      .where(and(eq(webhookLogs.endpointId, webhookId), eq(webhookLogs.orgId, session.orgId)))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(20);

    return ok(logs);
  });
}
