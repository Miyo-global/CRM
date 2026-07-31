

import { withAuth, ok } from "@/lib/api/helpers";
import { getUnreadTotal } from "@/server/queries/chat";

export async function GET() {
  return withAuth(async (session) => {
    const total = await getUnreadTotal(session.user.id);
    return ok({ total });
  });
}
