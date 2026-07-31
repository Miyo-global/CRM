import "server-only";

import { aiInvoke, isOpenAIConfigured } from "./openai";
import { reviewDraftPrompt, type ReviewDraftInput } from "./prompts";
import { ReviewDraftSchema, type ReviewDraftResult } from "./schemas";
import { db } from "@/lib/db";
import { users, goals, attendance, organizationMembers } from "@/lib/db/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { startOfDay, endOfDay } from "@/lib/date-utils";

export async function aiGenerateReview(
  orgId: string,
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ReviewDraftResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-review] OpenAI not configured");
    return null;
  }

  const [employee] = await db
    .select({
      name: users.name,
      role: users.role,
    })
    .from(users)
    .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .where(and(eq(users.id, userId), eq(organizationMembers.orgId, orgId)));

  if (!employee) return null;

  const employeeGoals = await db
    .select({ goal: goals.title, achieved: goals.status, progress: goals.progress })
    .from(goals)
    .where(
      and(
        eq(goals.orgId, orgId),
        eq(goals.userId, userId),
        gte(goals.createdAt, startOfDay(periodStart)),
        lte(goals.createdAt, endOfDay(periodEnd)),
      ),
    )
    .limit(20);

  const [attendanceData] = await db
    .select({
      total: count(),
      present: sql<number>`SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int`,
    })
    .from(attendance)
    .where(
      and(
        eq(attendance.orgId, orgId),
        eq(attendance.userId, userId),
        gte(attendance.date, periodStart),
        lte(attendance.date, periodEnd),
      ),
    );

  const attendanceRate = attendanceData && attendanceData.total > 0
    ? Math.round((Number(attendanceData.present) / attendanceData.total) * 100)
    : null;

  const input: ReviewDraftInput = {
    employeeName: employee.name ?? "Employee",
    role: employee.role,
    department: null,
    periodStart,
    periodEnd,
    goals: employeeGoals.map((g) => ({
      goal: g.goal,
      achieved: g.achieved === "COMPLETED",
      progress: g.progress ?? 0,
    })),
    recentActivities: null,
    attendanceRate,
    managerNotes: null,
  };

  const prompt = reviewDraftPrompt(input);

  const result = await aiInvoke({
    model: "fast",
    schema: ReviewDraftSchema,
    schemaName: "review_draft",
    system: prompt.system,
    user: prompt.user,
  });

  result.overallRating = Math.max(1, Math.min(5, result.overallRating));
  result.ratings = result.ratings.map((r) => ({
    ...r,
    score: Math.max(1, Math.min(5, r.score)),
  }));

  return result;
}
