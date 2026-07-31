import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { getRevenueVsGoal } from "@/server/queries/sales-dashboard";
import { z } from "zod";

const schema = z.object({
  year: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { year } = parseQuery(req, schema);
    const yearNum = year ? Number(year) : new Date().getFullYear();
    const data = await getRevenueVsGoal(session.orgId, yearNum);
    return ok(data);
  });
}
