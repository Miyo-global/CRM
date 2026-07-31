import { withAdmin, ok, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users, leaveTypes } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  month: z
    .string()
    .regex(/^\d{1,2}$/)
    .transform(Number)
    .optional(),
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number)
    .optional(),
});

export interface LeaveCalendarEntry {
  id: number;
  userId: string;
  userName: string;
  userImage: string | null;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
}

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const parsed = querySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return err("Invalid query parameters", 400);
    }

    const now = new Date();
    const month = parsed.data.month ?? now.getMonth() + 1;
    const year = parsed.data.year ?? now.getFullYear();

    if (month < 1 || month > 12) {
      return err("month must be between 1 and 12", 400);
    }

    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const rows = await db
      .select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        status: leaveRequests.status,
        leaveTypeId: leaveRequests.leaveTypeId,
        userName: users.name,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userImage: users.image,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          lte(leaveRequests.startDate, monthEnd),
          gte(leaveRequests.endDate, monthStart),
        ),
      );

    const leaveTypeIds = [...new Set(rows.map((r) => r.leaveTypeId).filter(Boolean) as number[])];
    let leaveTypeMap = new Map<number, string>();
    if (leaveTypeIds.length > 0) {
      const types = await db
        .select({ id: leaveTypes.id, name: leaveTypes.name })
        .from(leaveTypes)
        .where(
          and(
            eq(leaveTypes.orgId, session.orgId),
            inArray(leaveTypes.id, leaveTypeIds),
          ),
        );
      leaveTypeMap = new Map(types.map((t) => [t.id, t.name]));
    }

    const entries: LeaveCalendarEntry[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName:
        (r.userName ??
        [r.userFirstName, r.userLastName].filter(Boolean).join(" ")) ||
        "Unknown",
      userImage: r.userImage,
      startDate: r.startDate,
      endDate: r.endDate,
      leaveType: r.leaveTypeId ? (leaveTypeMap.get(r.leaveTypeId) ?? "Leave") : "Leave",
      status: r.status ?? "PENDING",
    }));

    return ok(entries);
  });
}
