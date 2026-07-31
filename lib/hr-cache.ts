import { cached, invalidateCache, CACHE_TTL } from "./cache";

export const HR_CACHE = {
  analytics: (orgId: string) => `hr:analytics:${orgId}`,
  recruitmentStats: (orgId: string) => `hr:recruitment:stats:${orgId}`,
  celebrations: (orgId: string) => `hr:celebrations:${orgId}`,
  attrition: (orgId: string) => `hr:attrition:${orgId}`,
  compensation: (orgId: string) => `hr:compensation:${orgId}`,
  compliance: (orgId: string) => `hr:compliance:${orgId}`,
  heatmap: (orgId: string, userId: string, year: number) => `hr:heatmap:${orgId}:${userId}:${year}`,
  dashboardMetrics: (orgId: string) => `hr:dashboard:metrics:${orgId}`,
  headcountTrends: (orgId: string) => `hr:dashboard:headcount-trends:${orgId}`,
} as const;


export async function invalidateHrDashboardCache(orgId: string): Promise<void> {
  await Promise.all([
    invalidateCache(HR_CACHE.analytics(orgId)),
    invalidateCache(HR_CACHE.dashboardMetrics(orgId)),
    invalidateCache(HR_CACHE.headcountTrends(orgId)),
    invalidateCache(HR_CACHE.celebrations(orgId)),
  ]);
}

export { cached, invalidateCache, CACHE_TTL };
