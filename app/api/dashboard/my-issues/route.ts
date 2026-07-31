import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery } from "@/lib/api/helpers";
import { getMyIssues } from "@/server/queries/dashboard";
import { z } from "zod";
import { logger } from "@/lib/logger";

const schema = z.object({
  limit: z.coerce.number().default(20),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      parseQuery(req, schema);
    } catch {
      return err("Invalid params", 400);
    }
    try {
      const issues = await getMyIssues(session.orgId, session.user.id);
      const mapped = issues.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status ?? "TODO",
        type: t.type ?? "TASK",
        priority: t.priority ?? "MEDIUM",
        ticketNumber: String(t.ticketNumber),
        updatedAt: t.updatedAt,
        projectName: t.project?.name ?? "",
        projectId: t.project?.id,
        projectKey: t.project?.key ?? "",
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              firstName: t.assignee.firstName,
              lastName: t.assignee.lastName,
              image: t.assignee.image,
            }
          : null,
      }));
      return ok(mapped);
    } catch (error) {
      logger.error("Failed", error);
      return err("Failed", 500);
    }
  });
}
