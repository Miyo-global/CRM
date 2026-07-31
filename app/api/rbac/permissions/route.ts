import { withAuth, ok, err } from "@/lib/api/helpers";
import { getAllPermissions } from "@/server/queries/rbac";

export async function GET() {
  return withAuth(async () => {
    try {
      const data = getAllPermissions();
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load permissions",
        500
      );
    }
  });
}
