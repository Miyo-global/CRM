import { withAuth, ok } from "@/lib/api/helpers";
import { getAttendanceStatus } from "@/server/queries/hr";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getAttendanceStatus(session.orgId, session.user.id);
    return ok(data);
  });
}
