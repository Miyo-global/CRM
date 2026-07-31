import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getTargetHistory } from "@/server/queries/crm";

type Ctx = { params: Promise<{ targetId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { targetId: id } = await ctx.params;
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return err("Invalid target id", 400);

  return withAuth(async (session) => {
    const data = await getTargetHistory(session.orgId!, targetId);
    return ok(data);
  });
}
