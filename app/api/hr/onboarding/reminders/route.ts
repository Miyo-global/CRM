import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingTasks, users, notifications } from "@/lib/db/schema";
import { eq, and, ne, sql, count } from "drizzle-orm";
import { sendTemplateEmail } from "@/lib/email/sender";
import { formatDateOnly } from "@/lib/date-utils";
import { createAuditLog } from "@/lib/audit-log";
import { logger } from "@/lib/logger";

export async function POST(_req: NextRequest) {
  return withAdmin(async (session) => {
    const incompleteUsers = await db
      .select({
        userId: onboardingTasks.userId,
        userName: users.name,
        userEmail: users.email,
        totalTasks: count(),
        pendingTasks: sql<number>`COUNT(CASE WHEN ${onboardingTasks.status} != 'COMPLETED' THEN 1 END)`,
        // MIYO-0154: the template leads with the oldest open due date.
        oldestDue: sql<Date | null>`MIN(CASE WHEN ${onboardingTasks.status} != 'COMPLETED' THEN ${onboardingTasks.dueDate} END)`,
      })
      .from(onboardingTasks)
      .innerJoin(users, eq(onboardingTasks.userId, users.id))
      .where(and(
        eq(onboardingTasks.orgId, session.orgId),
      ))
      .groupBy(onboardingTasks.userId, users.name, users.email)
      .having(sql`COUNT(CASE WHEN ${onboardingTasks.status} != 'COMPLETED' THEN 1 END) > 0`);

    if (incompleteUsers.length === 0) {
      return ok({ sent: 0, total: 0 });
    }

    let sentCount = 0;

    for (const user of incompleteUsers) {
      await db.insert(notifications).values({
        orgId: session.orgId,
        userId: user.userId,
        type: "WARNING",
        title: "Onboarding Reminder",
        message: `You have ${user.pendingTasks} pending onboarding task(s). Please complete them at your earliest convenience.`,
        link: "/hr/onboarding/my-tasks",
      });

      if (user.userEmail) {
        try {
          await sendTemplateEmail("onboarding-reminder", {
            to: user.userEmail,
            vars: {
              pending_count: Number(user.pendingTasks),
              oldest_due_date: user.oldestDue ? formatDateOnly(user.oldestDue) : "soon",
            },
          });
          sentCount++;
        } catch (e) {
          logger.error("Failed to send onboarding reminder email", { userId: user.userId, error: e });
        }
      }
    }

    void createAuditLog({
      action: "onboarding.reminder_sent",
      userId: session.user.id,
      orgId: session.orgId,
      metadata: { recipientCount: incompleteUsers.length, emailsSent: sentCount },
    }).catch(() => {});

    return ok({ sent: sentCount, total: incompleteUsers.length });
  });
}
