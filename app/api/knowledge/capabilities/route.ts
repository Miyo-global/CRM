import { ok, withAuth } from "@/lib/api/helpers";
import { getKbCapabilities } from "@/lib/knowledge/config";

/** KB-0005: booleans the UI uses to hide controls it cannot back. */
export async function GET() {
  return withAuth(async (session) => ok(await getKbCapabilities(session.orgId)));
}
