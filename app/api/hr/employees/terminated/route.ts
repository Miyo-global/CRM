import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { getTerminatedEmployees } from "@/server/queries/hr";
import type { TerminatedEmployee } from "@/types/hr/employees";

export async function GET() {
  return withAuth<TerminatedEmployee[]>(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }
    const branchCtx = {
      role: session.user.role ?? "",
      branchId: session.branchId,
      userId: session.user.id,
    };

    const data = await getTerminatedEmployees(session.orgId, branchCtx);
    return ok(data);
  });
}
