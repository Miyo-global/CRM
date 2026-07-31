import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { findDuplicateLeads } from "@/server/queries/duplicate-leads";
import { logger } from "@/lib/logger";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const groups = await findDuplicateLeads(session.orgId);
      const total = groups.length;
      return ok({ groups, total });
    } catch (e) {
      logger.error("Failed to scan for duplicate leads", { error: e instanceof Error ? e.message : "Unknown" });
      return err("Failed to scan for duplicates", 500);
    }
  });
}
