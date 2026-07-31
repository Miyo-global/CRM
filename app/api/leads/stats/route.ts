import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { getLeadStats } from "@/server/queries/leads";
import { z } from "zod";

const querySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, querySchema);
    const data = await getLeadStats(session.orgId!, {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      role: session.user.role ?? undefined,
      userId: session.user.id,
      branch: {
        role: session.user.role ?? "",
        branchId: session.branchId,
        userId: session.user.id,
      },
    });
    return ok(data);
  });
}
