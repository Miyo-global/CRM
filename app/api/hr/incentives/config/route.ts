import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getIncentiveConfigs, setIncentiveConfig } from "@/server/queries/hr/incentives";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createIncentiveConfigBodySchema } from "@/lib/validations/incentive-rate";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getIncentiveConfigs(session.orgId);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can set incentive config.", 403);
    }

    try {
      const body = await parseBody(req, createIncentiveConfigBodySchema);
      const config = await setIncentiveConfig(session.orgId, session.user.id, body.incentiveRate);
      return ok(config);
    } catch (e) {
      if (e instanceof ZodError) {
        return err(e.issues[0]?.message ?? "Invalid incentive rate.", 400);
      }
      throw e;
    }
  });
}
