

import { withAuth, ok } from "@/lib/api/helpers";
import { getOnlineUsers } from "@/server/queries/chat";

export async function GET() {
  return withAuth(async (session) => {
    const online = await getOnlineUsers(session.orgId);
    return ok(online);
  });
}
