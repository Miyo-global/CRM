import { withAdmin, ok } from "@/lib/api/helpers";
import { getUnverifiedLeads } from "@/server/queries/leads";

export async function GET() {
  return withAdmin(async (session) => {
    const data = await getUnverifiedLeads(session.orgId!);
    return ok(data);
  });
}
