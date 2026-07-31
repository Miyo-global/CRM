import { withAuth, ok, err } from "@/lib/api/helpers";
import { getEmployeePayslips } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const requestedUserId = req.nextUrl.searchParams.get("userId");
    const isAdmin = isAdminOrOwner(session.user.role);

    if (requestedUserId && requestedUserId !== session.user.id && !isAdmin) {
      return err("Access denied: you can only view your own payslips.", 403);
    }

    const userId = isAdmin ? (requestedUserId || session.user.id) : session.user.id;
    const data = await getEmployeePayslips(session.orgId, userId, { paidOnly: !isAdmin });
    return ok(data);
  });
}
