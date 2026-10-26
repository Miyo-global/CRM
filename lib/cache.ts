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


  projectsList: (orgId: string) => `projects:list:${orgId}`,
  ticketsList: (orgId: string, projectId: number, hash: string) =>
    `tickets:list:${orgId}:${projectId}:${hash}`,

  supportDashboard: (orgId: string) => `support:dashboard:${orgId}`,





  searchResults: (orgId: string, hash: string) => `search:${orgId}:${hash}`,


  executiveDashboard: (orgId: string) => `dashboard:executive:${orgId}`,
  announcementsList: (orgId: string) => `dashboard:announcements:${orgId}`,
} as const;

export const CACHE_TTL = {
  SHORT: 30,
  MEDIUM: 300,
  LONG: 600,
  HOUR: 3600,
} as const;
