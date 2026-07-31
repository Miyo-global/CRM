import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { getAgingDeals } from "@/server/queries/sales-dashboard";
import { z } from "zod";

const schema = z.object({
  threshold: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { threshold } = parseQuery(req, schema);
    const thresholdDays = threshold ? Number(threshold) : 14;
    const data = await getAgingDeals(session.orgId, isNaN(thresholdDays) ? 14 : thresholdDays);
    return ok(data);
  });
}
