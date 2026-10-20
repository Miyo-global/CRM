import { withAuth, ok } from "@/lib/api/helpers";
import { getSupportTicketStats } from "@/server/queries/support";
import { isSupportStaff } from "@/lib/constants/support-sla";

export async function GET() {
  return withAuth(async (session) => {
    const viewerId = isSupportStaff(session.user.role) ? undefined : session.user.id;
    const stats = await getSupportTicketStats(session.orgId, viewerId);
    return ok(stats);
  });
}
