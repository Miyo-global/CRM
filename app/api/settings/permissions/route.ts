import { withAdmin, ok } from "@/lib/api/helpers";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export async function GET() {
  return withAdmin(async () => {
    return ok(PERMISSIONS);
  });
}
