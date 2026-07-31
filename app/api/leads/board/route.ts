import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { getLeadBoard } from "@/server/queries/leads";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { limit } = parseQuery(req, querySchema);
    const board = await getLeadBoard(session.orgId!, {
      role: session.user.role ?? undefined,
      userId: session.user.id,
      branch: {
        role: session.user.role ?? "",
        branchId: session.branchId,
        userId: session.user.id,
      },
      perStatusLimit: limit,
    });
    return ok(board);
  });
}
