import { redis, isRedisEnabled } from "./redis";

interface CacheOptions {
  ttlSeconds?: number;
  tags?: string[];
}

const DEFAULT_TTL = 300;

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttlSeconds = DEFAULT_TTL } = options;

  if (!isRedisEnabled() || !redis) {
    return fetcher();
  }

  try {
    const cachedValue = await redis.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }
  } catch {
    return fetcher();
  }

  const data = await fetcher();

  try {
    await redis.set(key, data, { ex: ttlSeconds });
  } catch {

  }

  return data;
}

export async function invalidateCache(key: string): Promise<void> {
  if (!isRedisEnabled() || !redis) return;

  try {
    await redis.del(key);
  } catch {

  }
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!isRedisEnabled() || !redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {

  }
}

export const CACHE_KEYS = {

  dashboardStats: (orgId: string) => `dashboard:stats:${orgId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userSession: (userId: string) => `user:session:${userId}`,
  userPermissions: (userId: string) => `user:permissions:${userId}`,
  unreadNotifications: (userId: string) => `notifications:unread:${userId}`,

  orgSettings: (orgId: string) => `org:settings:${orgId}`,
  rolePermissions: (orgId: string, role: string) => `org:roles:${orgId}:${role}`,

  leadsCount: (orgId: string) => `leads:count:${orgId}`,
  leadsList: (orgId: string, hash: string) => `leads:list:${orgId}:${hash}`,
  leadDetail: (orgId: string, id: number) => `leads:detail:${orgId}:${id}`,

  projectsList: (orgId: string) => `projects:list:${orgId}`,
  ticketsList: (orgId: string, projectId: number, hash: string) =>
    `tickets:list:${orgId}:${projectId}:${hash}`,

  salesDashboard: (orgId: string) => `sales:dashboard:${orgId}`,
  marketingDashboard: (orgId: string) => `marketing:dashboard:${orgId}`,
  ceDashboard: (orgId: string) => `ce:dashboard:${orgId}`,
  supportDashboard: (orgId: string) => `support:dashboard:${orgId}`,

  dealsForecast: (orgId: string) => `deals:forecast:${orgId}`,
  approvalsList: (orgId: string) => `deals:approvals:${orgId}`,

  clientsHealth: (orgId: string) => `clients:health:${orgId}`,
  churnAlerts: (orgId: string) => `clients:churn:${orgId}`,

  quotasList: (orgId: string) => `sales:quotas:${orgId}`,
  commissionsList: (orgId: string) => `sales:commissions:${orgId}`,

  campaignsList: (orgId: string) => `marketing:campaigns:${orgId}`,
  emailCampaignsList: (orgId: string) => `marketing:emailCampaigns:${orgId}`,

  searchResults: (orgId: string, hash: string) => `search:${orgId}:${hash}`,

  leadBoard: (orgId: string, hash: string) => `leads:board:${orgId}:${hash}`,
  leadStats: (orgId: string, hash: string) => `leads:stats:${orgId}:${hash}`,

  executiveDashboard: (orgId: string) => `dashboard:executive:${orgId}`,
  announcementsList: (orgId: string) => `dashboard:announcements:${orgId}`,
} as const;

export const CACHE_TTL = {
  SHORT: 30,
  MEDIUM: 300,
  LONG: 600,
  HOUR: 3600,
} as const;
