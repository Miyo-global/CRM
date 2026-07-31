

import { withAuth, ok } from "@/lib/api/helpers";
import { upsertPresence } from "@/server/queries/chat";

export async function POST() {
  return withAuth(async (session) => {
    await upsertPresence(session.user.id, session.orgId);
    return ok({ ok: true });
  });
}
