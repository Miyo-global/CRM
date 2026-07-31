import { withAuth, ok, err } from "@/lib/api/helpers";
import { getAccountHierarchy } from "@/server/queries/crm-accounts";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ organizationId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { organizationId } = await params;
  const id = Number(organizationId);
  if (!Number.isFinite(id)) return err("Invalid organizationId", 400);

  return withAuth(async (session) => {
    const tree = await getAccountHierarchy(session.orgId, id);
    if (!tree) return err("Organization not found", 404);
    return ok(tree);
  });
}
