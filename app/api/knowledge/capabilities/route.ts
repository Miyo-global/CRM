import { ok, withAuth } from "@/lib/api/helpers";
import { getKbCapabilities } from "@/lib/knowledge/config";
import { requireKnowledgeBase } from "@/lib/knowledge/gate";

/** KB-0005: booleans the UI uses to hide controls it cannot back. */
export async function GET() {
  return withAuth(async (session) => {
    const gate = await requireKnowledgeBase(session.orgId);
    if (gate) return gate;
    return ok(await getKbCapabilities(session.orgId));
  });
}
