import { withAuth, ok } from "@/lib/api/helpers";
import { getMyTargets } from "@/server/queries/crm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getMyTargets(session.user.id, session.orgId!);
    return ok(data);
  });
}
