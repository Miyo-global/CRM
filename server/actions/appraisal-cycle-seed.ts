import { addDays, addYears, subDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appraisalCycles,
  appraisals,
  organizationMembers,
  organizations,
  users,
} from "@/lib/db/schema";
import { createAppraisalBundle } from "@/lib/hr/create-appraisal";
import { logger } from "@/lib/logger";

function stripTime(d: Date): Date {
  return startOfDay(d);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextAnniversaryFrom(anchorYmd: string, from: Date): Date {
  const [yy, mm, dd] = anchorYmd.split("-").map(Number);
  let y = from.getFullYear();
  let cand = new Date(y, mm - 1, dd);
  if (stripTime(cand) < stripTime(from)) {
    y += 1;
    cand = new Date(y, mm - 1, dd);
  }
  return stripTime(cand);
}

export async function seedAnniversaryAppraisalCycles(): Promise<{
  orgsProcessed: number;
  cyclesCreated: number;
  appraisalsCreated: number;
}> {
  let orgsProcessed = 0;
  let cyclesCreated = 0;
  let appraisalsCreated = 0;

  const orgRows = await db.select({ id: organizations.id }).from(organizations);
  const today = stripTime(new Date());
  const horizon = stripTime(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));

  for (const org of orgRows) {
    orgsProcessed += 1;
    const members = await db
      .select({
        userId: organizationMembers.userId,
        joiningDate: users.joiningDate,
        createdAt: users.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(and(eq(organizationMembers.orgId, org.id), eq(users.isActive, true), eq(users.hasDashboardAccess, true)));

    for (const m of members) {
      const anchorStr = m.joiningDate ?? (m.createdAt ? ymd(new Date(m.createdAt)) : null);
      if (!anchorStr) continue;

      const nextAnn = nextAnniversaryFrom(anchorStr, today);
      if (nextAnn > horizon) continue;

      const daysUntil = differenceInCalendarDays(nextAnn, today);
      if (daysUntil < 0 || daysUntil > 30) continue;

      const periodStart = ymd(nextAnn);
      const periodEnd = ymd(subDays(addYears(nextAnn, 1), 1));

      const existing = await db.query.appraisalCycles.findFirst({
        where: and(
          eq(appraisalCycles.orgId, org.id),
          eq(appraisalCycles.userId, m.userId),
          eq(appraisalCycles.type, "ANNUAL"),
          eq(appraisalCycles.periodStart, periodStart)
        ),
      });
      if (existing) continue;

      const openAppraisal = await db.query.appraisals.findFirst({
        where: and(eq(appraisals.orgId, org.id), eq(appraisals.userId, m.userId), ne(appraisals.currentStage, "CLOSED")),
      });
      if (openAppraisal) continue;

      const hr = await db.query.organizationMembers.findFirst({
        where: and(eq(organizationMembers.orgId, org.id), eq(organizationMembers.role, "HR")),
        columns: { userId: true },
      });
      const initiator = hr?.userId ?? m.userId;

      try {
        const [cycle] = await db
          .insert(appraisalCycles)
          .values({
            orgId: org.id,
            userId: m.userId,
            type: "ANNUAL",
            periodStart,
            periodEnd,
            dueDate: ymd(addDays(nextAnn, 30)),
            anchorJoiningDate: anchorStr,
            status: "OPEN",
          })
          .returning({ id: appraisalCycles.id });
        cyclesCreated += 1;

        await createAppraisalBundle({
          orgId: org.id,
          userId: m.userId,
          cycleId: cycle!.id,
          type: "ANNUAL",
          periodStart,
          periodEnd,
          dueDate: null,
          anchorJoiningDate: anchorStr,
          initiatorId: initiator,
        });
        appraisalsCreated += 1;
      } catch (e) {
        logger.error("appraisal-cycle-seed row failed", { orgId: org.id, userId: m.userId, error: e });
      }
    }
  }

  return { orgsProcessed, cyclesCreated, appraisalsCreated };
}
