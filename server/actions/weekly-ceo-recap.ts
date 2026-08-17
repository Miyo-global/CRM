import { db } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  users,
  leads,
  leadActivities,
  tickets,
  leaveRequests,
} from "@/lib/db/schema";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { getWeeklyCeoRecapTemplate } from "@/lib/email-templates/weekly-ceo-recap";
import type { WeeklyCeoRecapData } from "@/lib/email-templates/weekly-ceo-recap";
import { generateRecapNarrative } from "@/lib/ai/weekly-recap-narrator";
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

      const [
        [employeeCount],
        [newLeadCount],
        [convertedCount],
        [activityCount],
        [openTicketCount],
        [closedTicketCount],
        [pendingLeaveCount],
        pipelineRaw,
      ] = await Promise.all([
        db.select({ count: count() })
          .from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .where(and(eq(organizationMembers.orgId, org.id), eq(users.isActive, true))),
        db.select({ count: count() })
          .from(leads)
          .where(and(eq(leads.orgId, org.id), gte(leads.createdAt, weekStart))),
        db.select({ count: count() })
          .from(leads)
          .where(and(eq(leads.orgId, org.id), eq(leads.status, "CONVERTED"), gte(leads.updatedAt, weekStart))),
        db.select({ count: count() })
          .from(leadActivities)
          .innerJoin(leads, eq(leads.id, leadActivities.leadId))
          .where(and(eq(leads.orgId, org.id), gte(leadActivities.createdAt, weekStart))),
        db.select({ count: count() })
          .from(tickets)
          .where(and(eq(tickets.orgId, org.id), sql`${tickets.status} NOT IN ('DONE', 'CANCELLED')`)),
        db.select({ count: count() })
          .from(tickets)
          .where(and(eq(tickets.orgId, org.id), eq(tickets.status, "DONE"), gte(tickets.updatedAt, weekStart))),
        db.select({ count: count() })
          .from(leaveRequests)
          .where(and(eq(leaveRequests.orgId, org.id), eq(leaveRequests.status, "PENDING"))),
        db.select({ status: leads.status, count: count() })
          .from(leads)
          .where(eq(leads.orgId, org.id))
          .groupBy(leads.status),
      ]);

      const leaderboardRaw = await db
        .select({
          userId: leads.assignedToId,
          name: users.name,
          converted: sql<number>`COUNT(CASE WHEN ${leads.status} = 'CONVERTED' THEN 1 END)`,
        })
        .from(leads)
        .innerJoin(users, eq(users.id, leads.assignedToId))
        .where(and(eq(leads.orgId, org.id), sql`${leads.assignedToId} IS NOT NULL`))
        .groupBy(leads.assignedToId, users.name)
        .orderBy(sql`COUNT(CASE WHEN ${leads.status} = 'CONVERTED' THEN 1 END) DESC`)
        .limit(5);

      const topPerformers = leaderboardRaw.map((r) => ({
        name: r.name || "Unknown",
        score: Number(r.converted) * 50,
      }));

      const recapData: WeeklyCeoRecapData = {
        weekRange,
        orgName: org.name,
        totalEmployees: employeeCount?.count ?? 0,
        newLeads: newLeadCount?.count ?? 0,
        convertedLeads: convertedCount?.count ?? 0,
        totalActivities: activityCount?.count ?? 0,
        openTickets: openTicketCount?.count ?? 0,
        closedTickets: closedTicketCount?.count ?? 0,
        pendingLeaves: pendingLeaveCount?.count ?? 0,
        topPerformers,
        pipelineSummary: pipelineRaw.map((r) => ({ status: r.status, count: r.count })),
      };

      let aiNarrative = "";
      try {
        aiNarrative = await generateRecapNarrative(recapData);
      } catch {
        aiNarrative = "";
      }

      const html = getWeeklyCeoRecapTemplate({ ...recapData, aiNarrative });

      for (const owner of owners) {
        if (!owner.email) continue;
        await sendEmail({
          to: owner.email,
          subject: `Weekly Recap — ${weekRange} | ${org.name}`,
          html,
        });
      }

      results.push({ orgId: org.id, sent: true });
    } catch (error) {
      logger.error("Weekly CEO recap failed for org", { orgId: org.id, error });
      results.push({ orgId: org.id, sent: false, error: String(error) });
    }
  }

  return { results, generatedAt: new Date().toISOString() };
}
