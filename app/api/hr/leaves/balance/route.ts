import { withAuth, ok } from "@/lib/api/helpers";
import { getLeaveBalance } from "@/server/queries/hr";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getLeaveBalance(session.orgId, session.user.id);
    return ok(data);
  });
}
