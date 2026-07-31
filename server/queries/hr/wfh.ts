"server-only";

import { db } from "@/lib/db";
import { wfhRequests, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { WfhRequest } from "@/types/hr";

export async function getWfhRequests(orgId: string, userId: string): Promise<WfhRequest[]> {
  return db.query.wfhRequests.findMany({
    where: and(eq(wfhRequests.orgId, orgId), eq(wfhRequests.userId, userId)),
    orderBy: [desc(wfhRequests.createdAt)],
  }) as unknown as Promise<WfhRequest[]>;
}

export async function getPendingWfhRequests(orgId: string): Promise<WfhRequest[]> {
  const rows = await db
    .select({
      id: wfhRequests.id,
      orgId: wfhRequests.orgId,
      userId: wfhRequests.userId,
      date: wfhRequests.date,
      reason: wfhRequests.reason,
      status: wfhRequests.status,
      approverId: wfhRequests.approverId,
      rejectionReason: wfhRequests.rejectionReason,
      createdAt: wfhRequests.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(wfhRequests)
    .innerJoin(users, eq(wfhRequests.userId, users.id))
    .where(and(eq(wfhRequests.orgId, orgId), eq(wfhRequests.status, "PENDING")))
    .orderBy(desc(wfhRequests.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    userId: r.userId,
    date: r.date,
    reason: r.reason,
    status: r.status,
    approverId: r.approverId,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt,
    user: { id: r.userId, firstName: r.userFirstName, lastName: r.userLastName, email: r.userEmail, image: r.userImage },
  })) as WfhRequest[];
}
