import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { getDealVelocity } from "@/server/queries/sales-dashboard";
import { z } from "zod";

const schema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { from, to } = parseQuery(req, schema);
    const range = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
    const data = await getDealVelocity(session.orgId, range);
    return ok(data);
  });
}
