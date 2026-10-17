import type { NextRequest } from "next/server";

import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { checkPermission } from "@/lib/rbac/middleware";
import { anonymiseCandidate } from "@/lib/ats/retention";

/**
 * MIYO-0679: erase a candidate on request. Needs ats:candidates:erase,
 * which only HR and the admins hold — a recruiter cannot do it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const candidateId = Number((await params).candidateId);
    if (!Number.isInteger(candidateId)) return err("Invalid candidate ID.", 400);

    const mayErase = await checkPermission(
      db,
      session.user.id,
      session.orgId,
      session.user.role,
      "ats:candidates:erase",
    );
    if (!mayErase) return err("Forbidden", 403);

    const erased = await anonymiseCandidate(candidateId, session.orgId, {
      userId: session.user.id,
      reason: "request",
    });
    if (!erased) return err("Candidate not found.", 404);

    return ok({ erased: true });
  }, req);
}
