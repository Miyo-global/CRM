import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingTasks, users, notifications } from "@/lib/db/schema";
import { eq, and, ne, sql, count } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
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
          await sendEmail({
            to: user.userEmail,
            subject: "Onboarding Reminder — Pending Tasks",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f2b7f;">Onboarding Reminder</h2>
                <p>Hi ${user.userName || "there"},</p>
                <p>You have <strong>${user.pendingTasks}</strong> pending onboarding task(s) out of <strong>${user.totalTasks}</strong> total.</p>
                <p>Please log in and complete your remaining tasks to finish your onboarding process.</p>
                <a href="${process.env.NEXTAUTH_URL || ""}/hr/onboarding/my-tasks"
                   style="display: inline-block; padding: 10px 24px; background: #bd882c; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                  Complete Tasks
                </a>
                <p style="color: #666; margin-top: 20px; font-size: 12px;">
                  This is an automated reminder from your HR team.
                </p>
              </div>
            `,
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
