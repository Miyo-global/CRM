import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { getEmployeeTickets } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const userId = req.nextUrl.searchParams.get("userId") || session.user.id;
    if (userId !== session.user.id && !isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }
    const data = await getEmployeeTickets(session.orgId, userId);
    return ok(data);
  });
}
