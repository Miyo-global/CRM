/**
 * KB-0054: telling people they were mentioned.
 *
 * Two rules do the work here. Only *newly* mentioned people are told, because
 * a page is saved every few seconds while being written and re-notifying on
 * each save is how a mention becomes noise people mute. And a mention does not
 * grant access: someone who cannot view the page is not notified about it,
 * since the notification itself would leak the page's title.
 *
 * Streamline: kb-page-writer.service.ts deliverMentions,
 * core/kb-notification-visibility.ts.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbPages, organizationMembers, users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { sendNotification } from "@/lib/notifications/send";
import { pageHref } from "@/lib/knowledge/routes";

import { resolvePageAccess, type KbActor } from "./authorization";
import { resolveKbPermissions } from "./actor";

export interface MentionDelivery {
  notified: string[];
  skipped: Array<{ userId: string; reason: "no_access" | "not_in_org" | "self" }>;
}

/**
 * Notifies the people in `userIds` who can actually view the page. Never
 * throws: a mention that cannot be delivered must not fail the save that
 * carried it.
 */
export async function deliverMentions(
  orgId: string,
  pageId: number,
  actorId: string,
  userIds: readonly string[],
): Promise<MentionDelivery> {
  const delivery: MentionDelivery = { notified: [], skipped: [] };
  if (userIds.length === 0) return delivery;

  try {
    const page = await db.query.kbPages.findFirst({
      where: and(eq(kbPages.id, pageId), eq(kbPages.orgId, orgId)),
      columns: { id: true, title: true },
    });
    if (!page) return delivery;

    for (const userId of new Set(userIds)) {
      if (userId === actorId) {
        delivery.skipped.push({ userId, reason: "self" });
        continue;
      }

      const membership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.orgId, orgId),
        ),
        columns: { role: true },
      });
      if (!membership) {
        delivery.skipped.push({ userId, reason: "not_in_org" });
        continue;
      }

      // The mentioned person's own access decides this, not the mentioner's.
      const mentioned: KbActor = {
        userId,
        orgId,
        role: membership.role,
        permissions: await resolveKbPermissions(orgId, userId, membership.role),
      };
      const decision = await resolvePageAccess(mentioned, pageId, "view");
      if (decision.outcome !== "allowed") {
        delivery.skipped.push({ userId, reason: "no_access" });
        continue;
      }

      const recipient = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { email: true },
      });

      await sendNotification({
        orgId,
        userId,
        type: "INFO",
        title: "You were mentioned in a page",
        message: `You were mentioned in "${page.title || "Untitled"}".`,
        link: pageHref(pageId),
        channel: "both",
        recipientEmail: recipient?.email,
        metadata: { pageId, kind: "knowledge.article.mentioned" },
      });

      delivery.notified.push(userId);
    }
  } catch (error) {
    logger.error("kb.mentions.delivery_failed", { orgId, pageId, error: String(error) });
  }

  return delivery;
}
