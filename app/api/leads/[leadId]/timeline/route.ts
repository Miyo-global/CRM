import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getLeadTimeline } from "@/server/queries/leads";

const limitSchema = z.coerce.number().int().min(1).max(100);

type Ctx = { params: Promise<{ leadId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const limitResult = limitSchema.safeParse(
      req.nextUrl.searchParams.get("limit") ?? "50"
    );
    const limit = limitResult.success ? limitResult.data : 50;
    const timeline = await getLeadTimeline(session.orgId!, leadId, limit);
    return ok(timeline);
  });
}
