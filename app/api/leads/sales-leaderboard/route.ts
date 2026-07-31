import { withAuth, ok } from "@/lib/api/helpers";
import { getSalesLeaderboard } from "@/server/queries/leads-analytics";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getSalesLeaderboard(session.orgId);
    return ok(data);
  });
}
