import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { departments, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { toPickerEntry } from "@/lib/hr/directory-view";
import { fnfEligibleUsers } from "@/lib/hr/fnf-eligible";

/** People the FnF create form can pick: a live resignation or termination, no settlement yet. */
export async function GET() {
  return withAdmin(async (session) => {
    const eligible = await fnfEligibleUsers(session.orgId);
    if (eligible.size === 0) return ok([]);

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        designation: users.designation,
        department: departments.name,
        email: users.email,
      })
      .from(users)
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .where(inArray(users.id, [...eligible.keys()]))
      .orderBy(users.name);

    return ok(rows.map((row) => toPickerEntry(row, session.user)));
  });
}
