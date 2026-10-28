import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ilike, sql } from "drizzle-orm";
import {
  AUTO_EMPLOYEE_ID_PREFIX,
  buildAutoEmployeeId,
  parseAutoSequence,
  yearSuffix,
} from "@/lib/hr/employee-id-format";
import { escapeLike } from "@/lib/db/escape-like";

export {
  AUTO_EMPLOYEE_ID_PREFIX,
  buildAutoEmployeeId,
  normalizeEmployeeIdInput,
  parseAutoSequence,
} from "@/lib/hr/employee-id-format";

type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

/**
 * Serialises employee-ID allocation: take this inside the transaction that
 * inserts the user, then pick/check the ID with that same tx. Without it two
 * concurrent hires read the same max and both claim it (there is no unique
 * index on users.employee_id).
 */
export async function lockEmployeeIdAllocation(tx: Executor): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('users.employee_id'))`);
}

export async function generateNextEmployeeId(
  referenceDate: Date = new Date(),
  executor: Executor = db,
): Promise<string> {
  const yy = yearSuffix(referenceDate);
  const prefix = `${AUTO_EMPLOYEE_ID_PREFIX}${yy}`;

  const rows = await executor
    .select({ employeeId: users.employeeId })
    .from(users)
    .where(ilike(users.employeeId, `${escapeLike(prefix)}%`));

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
      const global = await executor.query.users.findFirst({
        where: (u, { eq }) => eq(u.employeeId, candidate),
        columns: { id: true },
      });
      if (!global) return candidate;
    }
  }

  throw new Error("Unable to allocate a unique employee ID");
}
