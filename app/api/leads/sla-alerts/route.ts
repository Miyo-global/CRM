import { withAuth, ok } from "@/lib/api/helpers";
import { getLeadSlaAlerts } from "@/server/queries/leads";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getLeadSlaAlerts(session.orgId!, {
      role: session.user.role ?? undefined,
      userId: session.user.id,
    });
    return ok(data);
  });
}
