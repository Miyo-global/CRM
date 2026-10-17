import { db } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  users,
  attendance,
  projects,
  resignations,
  leaveRequests,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { sendTemplateEmail } from "@/lib/email/sender";
import { isPresentAttendanceStatus } from "@/lib/hr/attendance-summary";
import { formatDateOnly } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { subDays } from "date-fns";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";

export async function generateAndSendWeeklyCeoRecap() {
  const allOrgs = await db.query.organizations.findMany();
  const results: { orgId: string; sent: boolean; error?: string }[] = [];

  const now = new Date();
  const weekStart = subDays(now, 7);
  const istDayMonth = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    month: "short",
    day: "numeric",
  });
  const istDayMonthYear = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const weekRange = `${istDayMonth.format(weekStart)} — ${istDayMonthYear.format(now)}`;

  for (const org of allOrgs) {
    try {
      const sendKey = `weekly-ceo-recap:${org.id}`;
      const sendBucket = weekRange;
      const claim = await db.execute<{ job_name: string }>(sql`
        INSERT INTO cron_runs (job_name, bucket, ran_at)
        VALUES (${sendKey}, ${sendBucket}, now())
        ON CONFLICT DO NOTHING
        RETURNING job_name
      `).catch(() => ({ rows: [{ job_name: sendKey }] } as unknown as { rows: { job_name: string }[] }));
      const rows = (claim as unknown as { rows?: unknown[] }).rows ?? (claim as unknown as unknown[]);
      if (Array.isArray(rows) && rows.length === 0) {
        results.push({ orgId: org.id, sent: false, error: "already-sent" });
        continue;
      }

      const owners = await db
        .select({ email: users.email, name: users.name })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(
          and(
            eq(organizationMembers.orgId, org.id),
            eq(organizationMembers.role, "CEO"),
            eq(users.isActive, true)
          )
        );

      if (owners.length === 0) {
        results.push({ orgId: org.id, sent: false, error: "No active CEO" });
        continue;
      }

      // MIYO-0288: the recap is an HR week in one screen. The lead and deal
      // figures it used to carry belonged to the CRM module, which is gone.
      const weekStartDate = formatDateOnly(weekStart);
      const todayDate = formatDateOnly(now);

      const [
        [headcount],
        [joiners],
        [leavers],
        [openApprovals],
        [leaveDays],
        attendanceRows,
        projectRows,
      ] = await Promise.all([
        db.select({ count: count() })
          .from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .where(and(eq(organizationMembers.orgId, org.id), eq(users.isActive, true))),
        db.select({ count: count() })
          .from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .where(
            and(
              eq(organizationMembers.orgId, org.id),
              gte(users.joiningDate, weekStartDate),
              lte(users.joiningDate, todayDate),
            ),
          ),
        db.select({ count: count() })
          .from(resignations)
          .where(
            and(
              eq(resignations.orgId, org.id),
              gte(resignations.lastWorkingDate, weekStartDate),
              lte(resignations.lastWorkingDate, todayDate),
            ),
          ),
        db.select({ count: count() })
          .from(leaveRequests)
          .where(and(eq(leaveRequests.orgId, org.id), eq(leaveRequests.status, "PENDING"))),
        db.select({ count: count() })
          .from(leaveRequests)
          .where(
            and(
              eq(leaveRequests.orgId, org.id),
              eq(leaveRequests.status, "APPROVED"),
              lte(leaveRequests.startDate, todayDate),
              gte(leaveRequests.endDate, weekStartDate),
            ),
          ),
        db.select({ status: attendance.status, count: count() })
          .from(attendance)
          .where(
            and(
              eq(attendance.orgId, org.id),
              gte(attendance.date, weekStartDate),
              lte(attendance.date, todayDate),
            ),
          )
          .groupBy(attendance.status),
        db.select({ status: projects.status, count: count() })
          .from(projects)
          .where(eq(projects.orgId, org.id))
          .groupBy(projects.status),
      ]);

      const attendanceTotal = attendanceRows.reduce((sum, r) => sum + r.count, 0);
      const presentCount = attendanceRows
        .filter((r) => isPresentAttendanceStatus(r.status))
        .reduce((sum, r) => sum + r.count, 0);
      const projectsTotal = projectRows.reduce((sum, r) => sum + r.count, 0);
      const projectsOnTrack = projectRows
        .filter((r) => r.status === "ACTIVE")
        .reduce((sum, r) => sum + r.count, 0);

      await sendTemplateEmail("weekly-ceo-recap", {
        to: owners.map((o) => o.email).filter((e): e is string => Boolean(e)),
        vars: {
          week_range: weekRange,
          headcount: headcount?.count ?? 0,
          joiners: joiners?.count ?? 0,
          leavers: leavers?.count ?? 0,
          leave_days: leaveDays?.count ?? 0,
          open_approvals: openApprovals?.count ?? 0,
          present_pct: attendanceTotal === 0 ? 0 : Math.round((presentCount / attendanceTotal) * 100),
          projects_total: projectsTotal,
          projects_on_track: projectsOnTrack,
        },
      });

      results.push({ orgId: org.id, sent: true });
    } catch (error) {
      logger.error("Weekly CEO recap failed for org", { orgId: org.id, error });
      results.push({ orgId: org.id, sent: false, error: String(error) });
    }
  }

  return { results, generatedAt: new Date().toISOString() };
}
