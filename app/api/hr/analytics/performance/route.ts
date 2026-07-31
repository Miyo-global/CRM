import { withAdmin, ok, toNumber } from "@/lib/api/helpers";
import { getPerformanceAnalytics } from "@/server/queries/hr-analytics";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const { searchParams } = req.nextUrl;
    const data = await getPerformanceAnalytics({
      orgId: session.orgId,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      departmentId: toNumber(searchParams.get("department")),
    });
    return ok(data);
  });
}
