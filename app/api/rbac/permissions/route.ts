import { withAdmin, ok, serverError } from "@/lib/api/helpers";
import { getAllPermissions } from "@/server/queries/rbac";

export async function GET() {
  return withAdmin(async (session) => {
    try {
      const data = getAllPermissions();
      return ok(data);
    } catch (error) {
      return serverError(error, { route: "rbac/permissions", orgId: session.orgId }, "Failed to load permissions.");
    }
  });
}
