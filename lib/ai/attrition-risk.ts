import "server-only";

import { aiInvoke, isOpenAIConfigured } from "./openai";
import { attritionRiskPrompt, type AttritionRiskInput } from "./prompts";
import { AttritionRiskSchema, type AttritionRiskResult } from "./schemas";
import { db } from "@/lib/db";
import {
  users,
  organizationMembers,
  attendance,
  leaveRequests,
  helpdeskTickets,
  performanceReviews,
  goals,
} from "@/lib/db/schema";
import { eq, and, gte, count, sql, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function aiAnalyzeAttritionRisk(
  orgId: string,
  userId: string,
): Promise<AttritionRiskResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-attrition] OpenAI not configured");
    return null;
  }

  const [employee] = await db
    .select({
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .where(and(eq(users.id, userId), eq(organizationMembers.orgId, orgId)));

  if (!employee) return null;

  const tenureMonths = employee.createdAt
    ? Math.floor((Date.now() - new Date(employee.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [attRate] = await db
    .select({
      total: count(),
      present: sql<number>`SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int`,
    })
    .from(attendance)
    .where(
      and(
        eq(attendance.orgId, orgId),
        eq(attendance.userId, userId),
        gte(attendance.date, ninetyDaysAgo.toISOString().slice(0, 10)),
      ),
    );

  const attendanceRate = attRate && attRate.total > 0
    ? Math.round((Number(attRate.present) / attRate.total) * 100)
    : null;

  const [leaveCount] = await db
    .select({
      total: sql<number>`COALESCE(SUM(GREATEST(${leaveRequests.endDate}::date - ${leaveRequests.startDate}::date + 1, 0)), 0)::int`,
    })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.orgId, orgId),
        eq(leaveRequests.userId, userId),
        gte(leaveRequests.startDate, ninetyDaysAgo.toISOString().slice(0, 10)),
      ),
    );

  const [openTickets] = await db
    .select({ count: count() })
    .from(helpdeskTickets)
    .where(
      and(
        eq(helpdeskTickets.orgId, orgId),
        eq(helpdeskTickets.userId, userId),
        sql`${helpdeskTickets.status} != 'DONE'`,
      ),
    );

  const [lastReview] = await db
    .select({ rating: performanceReviews.overallRating })
    .from(performanceReviews)
    .where(
      and(
        eq(performanceReviews.orgId, orgId),
        eq(performanceReviews.userId, userId),
      ),
    )
    .orderBy(desc(performanceReviews.createdAt))
    .limit(1);

  const [activeGoals] = await db
    .select({ count: count() })
    .from(goals)
    .where(
      and(
        eq(goals.orgId, orgId),
        eq(goals.userId, userId),
        sql`${goals.status} IN ('IN_PROGRESS', 'NOT_STARTED')`,
      ),
    );

  const input: AttritionRiskInput = {
    employeeName: employee.name ?? "Employee",
    role: employee.role,
    department: null,
    tenureMonths,
    attendanceRate,
    recentLeaveDays: Number(leaveCount?.total ?? 0),
    openTickets: openTickets?.count ?? 0,
    lastReviewRating: lastReview?.rating ? Number(lastReview.rating) : null,
    lastPromotionMonths: null,
    hasGoals: (activeGoals?.count ?? 0) > 0,
  };

  const prompt = attritionRiskPrompt(input);

  const result = await aiInvoke({
    model: "fast",
    schema: AttritionRiskSchema,
    schemaName: "attrition_risk",
    system: prompt.system,
    user: prompt.user,
  });

  result.attritionRiskScore = Math.max(0, Math.min(100, Math.round(result.attritionRiskScore)));

  return result;
}
