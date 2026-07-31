import "server-only";

import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function findEmployeesByOrg(orgId: string) {
  return db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          designation: true,
          employeeId: true,
          monthlySalary: true,
          isActive: true,
        },
      },
    },
  });
}

export async function findEmployeeByUserId(orgId: string, userId: string) {
  return db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)),
    with: {
      user: true,
    },
  });
}
