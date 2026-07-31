import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { getLeadAnalytics } from "@/server/queries/leads";
import { z } from "zod";

const querySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, querySchema);
    const data = await getLeadAnalytics(session.orgId!, {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    return ok(data);
  });
}
