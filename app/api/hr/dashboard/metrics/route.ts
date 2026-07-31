import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  organizationMembers,
  users,
  leaveRequests,
  jobPostings,
} from "@/lib/db/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/hr-cache";
import {
  daysUntilNextBirthday,
  formatBirthdayMonthDayLabel,
  normalizeDobToYmd,
} from "@/lib/hr/upcoming-birthdays";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const data = await cached(
      `hr:dashboard:metrics:${orgId}`,
      async () => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const year = now.getFullYear();
        const month = now.getMonth();
        const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
        const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const [
          totalResult,
          activeResult,
          onLeaveTodayResult,
          pendingLeavesResult,
          openPositionsResult,
          monthlyHiresResult,
        ] = await Promise.all([
          db
            .select({ count: count() })
            .from(organizationMembers)
            .where(eq(organizationMembers.orgId, orgId)),

          db
            .select({ count: count() })
            .from(organizationMembers)
            .innerJoin(users, eq(organizationMembers.userId, users.id))
            .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true))),

          db
            .select({ count: count() })
            .from(leaveRequests)
            .where(
              and(
                eq(leaveRequests.orgId, orgId),
                eq(leaveRequests.status, "APPROVED"),
                lte(leaveRequests.startDate, todayStr),
                gte(leaveRequests.endDate, todayStr),
              ),
            ),

          db
            .select({ count: count() })
            .from(leaveRequests)
            .where(
              and(
                eq(leaveRequests.orgId, orgId),
                eq(leaveRequests.status, "PENDING"),
              ),
            ),

          db
            .select({ count: count() })
            .from(jobPostings)
            .where(
              and(eq(jobPostings.orgId, orgId), eq(jobPostings.status, "OPEN")),
            ),

          db
            .select({ count: count() })
            .from(organizationMembers)
            .innerJoin(users, eq(organizationMembers.userId, users.id))
            .where(
              and(
                eq(organizationMembers.orgId, orgId),
                gte(users.joiningDate, monthStart),
                lte(users.joiningDate, monthEnd),
              ),
            ),
        ]);

        const allMembersForBirthdays = await db
          .select({
            id: users.id,
            name: users.name,
            firstName: users.firstName,
            lastName: users.lastName,
            image: users.image,
            dateOfBirth: users.dateOfBirth,
          })
          .from(organizationMembers)
          .innerJoin(users, eq(organizationMembers.userId, users.id))
          .where(
            and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)),
          );

        const upcomingBirthdays: {
          id: string;
          name: string | null;
          firstName: string | null;
          lastName: string | null;
          image: string | null;
          dateOfBirth: string;
          daysUntil: number;
          birthdayMonthDay: string | null;
        }[] = [];

        for (const m of allMembersForBirthdays) {
          const ymd = normalizeDobToYmd(m.dateOfBirth);
          if (!ymd) continue;
          const daysUntil = daysUntilNextBirthday(ymd, now);
          if (daysUntil !== null && daysUntil <= 7) {
            upcomingBirthdays.push({
              ...m,
              dateOfBirth: ymd,
              daysUntil,
              birthdayMonthDay: formatBirthdayMonthDayLabel(ymd),
            });
          }
        }
        upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);

        return {
          totalEmployees: Number(totalResult[0]?.count ?? 0),
          activeEmployees: Number(activeResult[0]?.count ?? 0),
          onLeaveToday: Number(onLeaveTodayResult[0]?.count ?? 0),
          pendingLeaveRequests: Number(pendingLeavesResult[0]?.count ?? 0),
          openPositions: Number(openPositionsResult[0]?.count ?? 0),
          monthlyHires: Number(monthlyHiresResult[0]?.count ?? 0),
          upcomingBirthdays,
        };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
