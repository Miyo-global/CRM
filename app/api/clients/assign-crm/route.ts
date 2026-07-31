import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import {
  backfillCrmAssignments,
  getCrmAssignmentStats,
} from "@/server/queries/crm-clients";
import { logger } from "@/lib/logger";


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const stats = await getCrmAssignmentStats(session.orgId);
    return ok(stats);
  });
}


export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    try {
      await backfillCrmAssignments(session.orgId);
      const stats = await getCrmAssignmentStats(session.orgId);
      return ok(stats);
    } catch (error) {
      logger.error("assign-crm failed", { error: error instanceof Error ? error.message : "Unknown" });
      return err("Failed to assign CRM reps. Please try again.", 500);
    }
  });
}
