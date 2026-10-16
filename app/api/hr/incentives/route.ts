import { withAuth, ok } from "@/lib/api/helpers";
import { getIncentives } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/constants/roles";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

    // Compensation data: org-wide only for admins, otherwise just the
    // caller's own incentives (QA-0028).
    const data = await getIncentives(session.orgId, {
      status,
      page,
      limit,
      ...(isAdminOrOwner(session.user.role) ? {} : { salesRepId: session.user.id }),
    });
    return ok(data);
  });
}
