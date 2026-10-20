import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSupportDashboard } from "@/server/queries/crm";
import { isSupportStaff } from "@/lib/constants/support-sla";

export async function GET() {
  return withAuth(async (session) => {
    // Org-wide ticket analytics are for the support team only (AUTH-03).
    if (!isSupportStaff(session.user.role)) {
      return err("Support analytics are only available to the support team.", 403);
    }
    const data = await getSupportDashboard(session.orgId!);
    return ok(data);
  });
}
