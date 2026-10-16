import { withAuth, ok, serverError } from "@/lib/api/helpers";
import { getUserPermissions } from "@/server/queries/rbac";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getUserPermissions(session.user.id, session.orgId);
      return ok(data);
    } catch (error) {
      return serverError(error, { route: "rbac/user-permissions", orgId: session.orgId }, "Failed to load user permissions.");
    }
  });
}
