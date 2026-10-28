import type { NextRequest } from "next/server";
import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { generateNextEmployeeId, normalizeEmployeeIdInput } from "@/lib/hr/generate-employee-id";
import { parseCalendarDate } from "@/lib/date-utils";

/**
 * Hire wizard step 2: is a typed Employee ID taken, or (left blank) which ID
 * would be assigned. Advisory only; the onboard POST re-checks under a lock.
 */
export async function GET(req: NextRequest) {
  return withAdmin(async () => {
    const params = req.nextUrl.searchParams;
    const employeeId = normalizeEmployeeIdInput(params.get("employeeId") ?? undefined);
    if (employeeId) {
      const existing = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.employeeId, employeeId),
        columns: { id: true },
      });
      return ok({ exists: !!existing, next: null as string | null });
    }
    const joining = params.get("joiningDate");
    const next = await generateNextEmployeeId(joining ? parseCalendarDate(joining) : new Date());
    return ok({ exists: false, next });
  });
}
