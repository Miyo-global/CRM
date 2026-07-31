import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { getSalesFunnel } from "@/server/queries/sales-dashboard";
import { z } from "zod";

const schema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  repId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { from, to, repId } = parseQuery(req, schema);
    const range = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
    const repIdNum = repId ? Number(repId) : undefined;
    const data = await getSalesFunnel(session.orgId, range, repIdNum);
    return ok(data);
  });
}
