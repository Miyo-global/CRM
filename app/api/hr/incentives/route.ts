import { withAuth, ok } from "@/lib/api/helpers";
import { getIncentives } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

    const data = await getIncentives(session.orgId, { status, page, limit });
    return ok(data);
  });
}
