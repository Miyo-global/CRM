import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { checkLeaveRequest } from "@/lib/hr/leave-request-check";
import { z } from "zod";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  leaveTypeId: z.coerce.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isHalfDay: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

/** Same decision the POST route makes, so the form can show it before submit (QA-0050). */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const q = parseQuery(req, querySchema);
    const result = await checkLeaveRequest({
      orgId: session.orgId,
      userId: session.user.id,
      leaveTypeId: q.leaveTypeId,
      startDate: q.startDate,
      endDate: q.endDate,
      isHalfDay: q.isHalfDay ?? false,
    });
    return ok(result);
  });
}
