import { withAuth, ok } from "@/lib/api/helpers";
import { ensureLeaveTypes } from "@/server/actions/leave-actions/leave-balance";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** The org's own leave types, which HR can now edit (QA-0051). */
export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const types = await ensureLeaveTypes(session.orgId);
    return ok(types);
  });
}
