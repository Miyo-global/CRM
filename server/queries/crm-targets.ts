"server-only";

import { db } from "@/lib/db";
import { targets, targetHistory } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { TargetFilters } from "@/types/crm";

export async function getTargets(orgId: string, filters?: TargetFilters) {
  const f = [eq(targets.orgId, orgId)];
  if (filters?.userId) f.push(eq(targets.userId, filters.userId));
  if (filters?.period) f.push(eq(targets.period, filters.period));

  return db.query.targets.findMany({
    where: and(...f),
    with: { user: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(targets.createdAt)],
    limit: filters?.limit ?? 50,
    offset: filters?.offset ?? 0,
  });
}

export async function getMyTargets(userId: string, orgId: string) {
  return db.query.targets.findMany({
    where: and(eq(targets.orgId, orgId), eq(targets.userId, userId)),
    orderBy: [desc(targets.startDate)],
  });
}

export async function getTargetLeaderboard(orgId: string, metricType?: string) {
  const f = [eq(targets.orgId, orgId)];
  if (metricType) f.push(eq(targets.metricType, metricType));

  const allTargets = await db.query.targets.findMany({
    where: and(...f),
    with: { user: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(targets.currentValue)],
  });

  const userMap = new Map<
    string,
    { name: string; image: string | null; totalTarget: number; totalCurrent: number }
  >();

  for (const t of allTargets) {
    if (!t.user) continue;
    const existing = userMap.get(t.userId) || {
      name: t.user.name ?? "",
      image: t.user.image,
      totalTarget: 0,
      totalCurrent: 0,
    };
    const tv = Number(t.targetValue);
    const cv = Number(t.currentValue ?? 0);
    existing.totalTarget += Number.isFinite(tv) ? tv : 0;
    existing.totalCurrent += Number.isFinite(cv) ? cv : 0;
    userMap.set(t.userId, existing);
  }

  return Array.from(userMap.entries())
    .map(([userId, data]) => ({
      userId,
      ...data,
      progress:
        data.totalTarget > 0
          ? Math.round((data.totalCurrent / data.totalTarget) * 100)
          : 0,
    }))
    .sort((a, b) => b.progress - a.progress);
}

export async function getTargetHistory(orgId: string, targetId: number) {
  return db.query.targetHistory.findMany({
    where: and(
      eq(targetHistory.targetId, targetId),
      eq(targetHistory.orgId, orgId)
    ),
    with: { changedBy: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(targetHistory.createdAt)],
  });
}
