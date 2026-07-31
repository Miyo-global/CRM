"server-only";

import { db } from "@/lib/db";
import { helpdeskTickets } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { HelpdeskTicket } from "@/types/hr";

export async function getHelpdeskTickets(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  }
): Promise<HelpdeskTicket[]> {
  const conditions = [eq(helpdeskTickets.orgId, orgId)];

  if (params?.filterUserId) {
    conditions.push(eq(helpdeskTickets.userId, params.filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(helpdeskTickets.userId, userId));
  }

  if (params?.status) {
    conditions.push(eq(helpdeskTickets.status, params.status));
  }

  return db.query.helpdeskTickets.findMany({
    where: and(...conditions),
    orderBy: [desc(helpdeskTickets.createdAt)],
  }) as unknown as Promise<HelpdeskTicket[]>;
}
