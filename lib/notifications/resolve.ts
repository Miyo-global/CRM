import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/**
 * Once a request is decided, the "… pending" notices sent to approvers say so
 * ("WFH request pending — Approved"), are marked read and stop looking
 * actionable (P2-notifications-stale-after-approve). `match` is the metadata
 * the notice was created with, e.g. { kind: "wfh", requestId: 12 }.
 */
export async function resolveRequestNotifications(
  orgId: string,
  match: Record<string, string | number>,
  outcome: string,
): Promise<void> {
  try {
    await db
      .update(notifications)
      .set({
        isRead: true,
        type: "INFO",
        title: sql`${notifications.title} || ${` — ${outcome}`}`,
        metadata: sql`coalesce(${notifications.metadata}, '{}'::jsonb) || ${JSON.stringify({ resolved: outcome })}::jsonb`,
      })
      .where(
        and(
          eq(notifications.orgId, orgId),
          sql`${notifications.metadata} @> ${JSON.stringify(match)}::jsonb`,
          sql`NOT (coalesce(${notifications.metadata}, '{}'::jsonb) ? 'resolved')`,
        ),
      );
  } catch (error) {
    logger.error("Failed to resolve request notifications", { match, error });
  }
}
