import { withAuth, ok, err } from "@/lib/api/helpers";
import { getUserPermissions } from "@/server/queries/rbac";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getUserPermissions(session.user.id, session.orgId);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load user permissions",
        500
      );
    }
  });
}
