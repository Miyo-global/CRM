import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPreferences, users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { blocksCategory, type EmailCategory } from "./preference-rules";

export type { EmailCategory };

/**
 * Keeps the addresses that still want this kind of mail.
 *
 * An address with no account and an account with no saved preferences both
 * stay on the list: silence is opting in, and a candidate or an ex-employee
 * has no preferences row at all.
 */
export async function filterByEmailPreference(
  recipients: string[],
  category: EmailCategory,
): Promise<string[]> {
  if (recipients.length === 0) return recipients;

  try {
    const rows = await db
      .select({
        email: users.email,
        emailEnabled: notificationPreferences.emailEnabled,
        categories: notificationPreferences.categories,
      })
      .from(users)
      .innerJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
      .where(inArray(users.email, recipients));

    const blocked = new Set(
      rows
        .filter((r) => blocksCategory(r, category))
        .map((r) => r.email)
        .filter((e): e is string => Boolean(e)),
    );

    if (blocked.size === 0) return recipients;
    return recipients.filter((to) => !blocked.has(to));
  } catch (error) {
    // A preferences lookup that fails must not swallow the mail.
    logger.error("Notification preference lookup failed", { category, error });
    return recipients;
  }
}
