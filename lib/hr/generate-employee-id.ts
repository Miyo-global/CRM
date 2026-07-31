import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ilike } from "drizzle-orm";
import {
  AUTO_EMPLOYEE_ID_PREFIX,
  buildAutoEmployeeId,
  parseAutoSequence,
  yearSuffix,
} from "@/lib/hr/employee-id-format";

export {
  AUTO_EMPLOYEE_ID_PREFIX,
  buildAutoEmployeeId,
  normalizeEmployeeIdInput,
  parseAutoSequence,
} from "@/lib/hr/employee-id-format";

export async function generateNextEmployeeId(referenceDate: Date = new Date()): Promise<string> {
  const yy = yearSuffix(referenceDate);
  const prefix = `${AUTO_EMPLOYEE_ID_PREFIX}${yy}`;

  const rows = await db
    .select({ employeeId: users.employeeId })
    .from(users)
    .where(ilike(users.employeeId, `${prefix}%`));

  let maxSeq = 0;
  for (const row of rows) {
    if (!row.employeeId) continue;
    const seq = parseAutoSequence(row.employeeId, yy);
    if (seq != null && seq > maxSeq) maxSeq = seq;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = buildAutoEmployeeId(referenceDate, maxSeq + 1 + attempt);
    const taken = rows.some((r) => r.employeeId?.toUpperCase() === candidate.toUpperCase());
    if (!taken) {
      const global = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.employeeId, candidate),
        columns: { id: true },
      });
      if (!global) return candidate;
    }
  }

  throw new Error("Unable to allocate a unique employee ID");
}
