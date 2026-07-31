

import { withAuth, ok } from "@/lib/api/helpers";
import { getOrgUsers } from "@/server/queries/chat";

export async function GET() {
  return withAuth(async (session) => {
    const orgUsers = await getOrgUsers(session.user.id, session.orgId);
    return ok(orgUsers);
  });
}
