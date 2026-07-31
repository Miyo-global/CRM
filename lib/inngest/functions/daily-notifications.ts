import { inngest } from "../client";
import { db } from "@/lib/db";
import { leaveRequests, holidays, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatDisplayDate, fromISODateString } from "@/lib/date-utils";
import { getTomorrowDateString } from "@/lib/hr/holiday-reminders";

export const dailyNotifications = inngest.createFunction(
  { id: "daily-notifications", name: "Daily Notifications", triggers: { cron: "0 8 * * *" } },
  async ({ step }) => {
    const upcomingHolidays = await step.run("check-upcoming-holidays", async () => {
      const tomorrowStr = getTomorrowDateString();

      return db.query.holidays.findMany({
        where: eq(holidays.date, tomorrowStr),
      });
    });

    if (upcomingHolidays.length > 0) {
      await step.run("notify-holiday", async () => {
        const allUsers = await db.query.users.findMany({
          where: eq(users.isActive, true),
          columns: { id: true, email: true, name: true },
        });

        for (const holiday of upcomingHolidays) {
          const holidayLabel = formatDisplayDate(fromISODateString(holiday.date), {
            month: "long",
            day: "numeric",
            year: "numeric",
          });

          for (const user of allUsers) {
            await inngest.send({
              name: "notification/send",
              data: {
                userId: user.id,
                type: "holiday_reminder",
                title: "Holiday Tomorrow",
                message: `${holiday.name} on ${holidayLabel}`,
                channels: ["in_app", "push"],
              },
            });
          }
        }

        return { notified: allUsers.length, holidays: upcomingHolidays.length };
      });
    }

    const pendingLeaves = await step.run("check-pending-leave-approvals", async () => {
      return db.query.leaveRequests.findMany({
        where: eq(leaveRequests.status, "PENDING"),
        with: {
          user: { columns: { name: true, email: true } },
        },
      });
    });

    if (pendingLeaves.length > 0) {
      await step.run("notify-pending-approvals", async () => {
        const approverIds = [...new Set(pendingLeaves.map((l) => l.approverId).filter(Boolean))] as string[];

        for (const approverId of approverIds) {
          const count = pendingLeaves.filter((l) => l.approverId === approverId).length;

          await inngest.send({
            name: "notification/send",
            data: {
              userId: approverId,
              type: "pending_leave_approval",
              title: "Pending Leave Approvals",
              message: `You have ${count} leave request(s) awaiting your approval`,
              link: "/hr/leaves",
              channels: ["in_app", "email"],
            },
          });
        }

        return { approversNotified: approverIds.length };
      });
    }

    return {
      holidaysNotified: upcomingHolidays.length,
      pendingLeaves: pendingLeaves.length,
    };
  }
);
