import { withAuth, ok } from "@/lib/api/helpers";
import { getSupportTicketStats } from "@/server/queries/support";

export async function GET() {
  return withAuth(async (session) => {
    const stats = await getSupportTicketStats(session.orgId);
    return ok(stats);
  });
}
