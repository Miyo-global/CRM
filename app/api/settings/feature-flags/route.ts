import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getOrgFeatureFlags, setOrgFeatureFlag, type OrgFeatureFlags } from "@/lib/org-features";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const updateSchema = z.object({
  flag: z.enum([
    "aiChat",
    "aiLeadScoring",
    "aiEmailDraft",
    "aiSmartNotifications",
    "aiWeeklyRecap",
  ] as const satisfies readonly (keyof OrgFeatureFlags)[]),
  enabled: z.boolean(),
});

export async function GET() {
  return withAuth(async (session) => {
    const flags = await getOrgFeatureFlags(session.orgId);
    return ok(flags);
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }

    const { flag, enabled } = await parseBody(req, updateSchema);
    await setOrgFeatureFlag(session.orgId, flag, enabled);
    return ok({ success: true, flag, enabled });
  });
}
