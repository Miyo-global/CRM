"server-only";

import { db } from "@/lib/db";
import { branches, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getBranches(orgId: string) {
  return db.query.branches.findMany({
    where: eq(branches.orgId, orgId),
    orderBy: [desc(branches.createdAt)],
    with: {
      branchManager: { columns: { id: true, name: true, image: true } },
      branchHr: { columns: { id: true, name: true, image: true } },
    },
  });
}

export async function getBranch(orgId: string, id: number) {
  const branch = await db.query.branches.findFirst({
    where: and(eq(branches.id, id), eq(branches.orgId, orgId)),
    with: {
      branchManager: {
        columns: { id: true, name: true, image: true, email: true },
      },
      branchHr: {
        columns: { id: true, name: true, image: true, email: true },
      },
    },
  });
  if (!branch) return null;

  const employees = await db.query.users.findMany({
    where: eq(users.branchId, id),
    columns: {
      id: true,
      name: true,
      image: true,
      role: true,
      isActive: true,
    },
  });

  return { ...branch, employees };
}


