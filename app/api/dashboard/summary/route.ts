import { withAuth, ok, serverError } from "@/lib/api/helpers";
import { logger } from "@/lib/logger";
import {
  getDashboardStats,
  getRoleStats,
  getActiveSprintSummary,
  getRecentProjects,
  getRecentActivity,
  getTodayActivities,
} from "@/server/queries/dashboard";

/**
 * Above-the-fold dashboard data in one request (MIYO-0063). Each part runs in
 * parallel; a failed part comes back as null with its name in `failed`, so
 * one slow or broken query does not blank the whole page.
 */
export async function GET() {
  return withAuth(async (session) => {
    const { orgId } = session;
    const { id: userId, role } = session.user;
    try {
      const parts = {
        stats: getDashboardStats(orgId, userId),
        roleStats: getRoleStats(orgId, userId),
        activeSprint: getActiveSprintSummary(orgId, userId, role),
        recentProjects: getRecentProjects(orgId, userId, role),
        recentActivity: getRecentActivity(orgId, userId, role),
        todayActivities: getTodayActivities(orgId),
      };
      const names = Object.keys(parts) as (keyof typeof parts)[];
      const settled = await Promise.allSettled(Object.values(parts));
      const data: Record<string, unknown> = {};
      const failed: string[] = [];
      settled.forEach((r, i) => {
        if (r.status === "fulfilled") data[names[i]] = r.value;
        else {
          data[names[i]] = null;
          failed.push(names[i]);
          logger.error("dashboard summary part failed", { part: names[i], orgId, error: String(r.reason) });
        }
      });
      if (failed.includes("stats")) throw new Error("dashboard stats failed");
      return ok({ ...data, failed });
    } catch (error) {
      return serverError(error, { route: "dashboard/summary", orgId }, "Could not load the dashboard.");
    }
  });
}
