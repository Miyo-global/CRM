import "server-only";

import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function findAttendanceForUserInRange(
  orgId: string,
  userId: string,
  startDate: string,
  endDate: string
) {
  return db.query.attendance.findMany({
    where: and(
      eq(attendance.orgId, orgId),
      eq(attendance.userId, userId),
      gte(attendance.date, startDate),
      lte(attendance.date, endDate)
    ),
    orderBy: [desc(attendance.date)],
  });
}

export async function findAttendanceByDate(orgId: string, userId: string, date: string) {
  return db.query.attendance.findFirst({
    where: and(
      eq(attendance.orgId, orgId),
      eq(attendance.userId, userId),
      eq(attendance.date, date)
    ),
  });
}
