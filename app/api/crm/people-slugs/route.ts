import { withAuth, ok } from "@/lib/api/helpers";
import { getAllPeopleSlugs } from "@/server/queries/crm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getAllPeopleSlugs(session.orgId!);
    return ok(data);
  });
}
