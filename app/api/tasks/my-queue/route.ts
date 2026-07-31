import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";


export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const rows = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, session.orgId),
          eq(tasks.assigneeId, session.user.id),
          eq(tasks.status, "pending"),
        ),
      )
      .orderBy(
        asc(tasks.dueDate),
        asc(tasks.createdAt),
      )
      .limit(50);

    const categorised = rows.map((task) => {
      let bucket: "OVERDUE" | "TODAY" | "THIS_WEEK" | "UPCOMING" | "NO_DATE" =
        "NO_DATE";

      if (task.dueDate) {
        const due = new Date(task.dueDate);
        if (due < todayStart) {
          bucket = "OVERDUE";
        } else if (due <= todayEnd) {
          bucket = "TODAY";
        } else {
          const weekEnd = new Date(todayEnd);
          weekEnd.setDate(weekEnd.getDate() + 6);
          bucket = due <= weekEnd ? "THIS_WEEK" : "UPCOMING";
        }
      }

      return { ...task, bucket };
    });

    const bucketOrder: Record<string, number> = {
      OVERDUE: 0,
      TODAY: 1,
      THIS_WEEK: 2,
      UPCOMING: 3,
      NO_DATE: 4,
    };
    categorised.sort(
      (a, b) =>
        bucketOrder[a.bucket] - bucketOrder[b.bucket] ||
        (a.dueDate && b.dueDate
          ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          : 0),
    );

    return ok(categorised);
  });
}
