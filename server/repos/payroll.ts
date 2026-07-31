import "server-only";

import { db } from "@/lib/db";
import { payrolls, salaryStructures } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function findPayrollByMonth(orgId: string, userId: string, month: string) {
  return db.query.payrolls.findFirst({
    where: and(
      eq(payrolls.orgId, orgId),
      eq(payrolls.userId, userId),
      eq(payrolls.month, month)
    ),
  });
}

export async function findPayrollsByOrg(orgId: string, month?: string) {
  const filters = [eq(payrolls.orgId, orgId)];
  if (month) filters.push(eq(payrolls.month, month));

  return db.query.payrolls.findMany({
    where: and(...filters),
    orderBy: [desc(payrolls.month), desc(payrolls.createdAt)],
  });
}

export async function findActiveSalaryStructure(orgId: string, userId: string) {
  return db.query.salaryStructures.findFirst({
    where: and(
      eq(salaryStructures.userId, userId),
      eq(salaryStructures.orgId, orgId),
      eq(salaryStructures.isActive, true)
    ),
  });
}
