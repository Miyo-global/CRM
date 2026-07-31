"server-only";

import { db } from "@/lib/db";
import { performanceReviews, goals } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { PerformanceReview, Goal } from "@/types/hr";

export async function getPerformanceReviews(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  filterUserId?: string
): Promise<PerformanceReview[]> {
  const conditions = [eq(performanceReviews.orgId, orgId)];

  if (filterUserId) {
    conditions.push(eq(performanceReviews.userId, filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(performanceReviews.userId, userId));
  }

  return db.query.performanceReviews.findMany({
    where: and(...conditions),
    orderBy: [desc(performanceReviews.periodEnd)],
  }) as unknown as Promise<PerformanceReview[]>;
}

export async function getGoals(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  filterUserId?: string
): Promise<Goal[]> {
  const conditions = [eq(goals.orgId, orgId)];

  if (filterUserId) {
    conditions.push(eq(goals.userId, filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(goals.userId, userId));
  }

  return db.query.goals.findMany({
    where: and(...conditions),
    orderBy: [desc(goals.createdAt)],
  }) as unknown as Promise<Goal[]>;
}
