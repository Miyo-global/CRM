import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  compOffGrants,
  holidayWorkRequests,
  attendance,
  leaveTypes,
  leaveBalances,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { HOLIDAY_WORK_FULL_DAY_HOURS } from "@/lib/hr/payroll-calculations";
import { createNotification } from "@/server/actions/create-notification";
import { z } from "zod";
import type { NextRequest } from "next/server";

const grantSchema = z.object({
  holidayWorkRequestId: z.number().int().positive(),
  grantedDays: z.number().min(0.5).max(1).default(1),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const userId = req.nextUrl.searchParams.get("userId");

    const targetUserId = isAdmin && userId ? userId : session.user.id;

    const rows = await db.query.compOffGrants.findMany({
      where: and(
        eq(compOffGrants.orgId, session.orgId),
        eq(compOffGrants.userId, targetUserId)
      ),
      with: {
        holidayWorkRequest: {
          columns: { id: true, requestDate: true, type: true, compensationPreference: true },
        },
        grantedByUser: { columns: { id: true, name: true } },
      },
      orderBy: [desc(compOffGrants.createdAt)],
    });

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can grant comp-off days.", 403);
    }

    const body = await parseBody(req, grantSchema);

    const hwr = await db.query.holidayWorkRequests.findFirst({
      where: and(
        eq(holidayWorkRequests.id, body.holidayWorkRequestId),
        eq(holidayWorkRequests.orgId, session.orgId)
      ),
    });
    if (!hwr) return err("Holiday work request not found.", 404);
    if (hwr.status !== "APPROVED") return err("Request must be approved before granting comp-off.", 400);
    if (hwr.compensationPreference !== "COMP_OFF") {
      return err("Employee chose extra pay, not comp-off, for this request.", 400);
    }

    const attendanceRow = await db.query.attendance.findFirst({
      where: and(
        eq(attendance.userId, hwr.userId),
        eq(attendance.orgId, session.orgId),
        eq(attendance.date, hwr.requestDate)
      ),
      columns: { id: true, workHours: true },
    });

    if (!attendanceRow) return err("No attendance record found for that day.", 400);
    const hoursWorked = parseFloat(attendanceRow.workHours ?? "0");
    if (hoursWorked < HOLIDAY_WORK_FULL_DAY_HOURS) {
      return err(
        `Employee worked ${hoursWorked.toFixed(1)} hours. Minimum ${HOLIDAY_WORK_FULL_DAY_HOURS} hours required for comp-off.`,
        400
      );
    }

    const existing = await db.query.compOffGrants.findFirst({
      where: eq(compOffGrants.holidayWorkRequestId, body.holidayWorkRequestId),
      columns: { id: true },
    });
    if (existing) return err("Comp-off already granted for this request.", 409);

    const expiryDate = new Date(hwr.requestDate);
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiryStr = expiryDate.toISOString().split("T")[0];

    const [grant] = await db.transaction(async (tx) => {
      const [g] = await tx.insert(compOffGrants).values({
        orgId: session.orgId,
        userId: hwr.userId,
        holidayWorkRequestId: body.holidayWorkRequestId,
        grantedDays: body.grantedDays.toString(),
        usedDays: "0",
        expiryDate: expiryStr,
        status: "ACTIVE",
        grantedBy: session.user.id,
      }).returning();

      const compOffType = await tx.query.leaveTypes.findFirst({
        where: and(eq(leaveTypes.orgId, session.orgId), eq(leaveTypes.name, "Compensatory Off")),
        columns: { id: true },
      });

      if (compOffType) {
        const currentYear = new Date().getFullYear();
        const existingBalance = await tx.query.leaveBalances.findFirst({
          where: and(
            eq(leaveBalances.userId, hwr.userId),
            eq(leaveBalances.orgId, session.orgId),
            eq(leaveBalances.leaveTypeId, compOffType.id),
            eq(leaveBalances.year, currentYear)
          ),
        });

        if (existingBalance) {
          await tx.update(leaveBalances).set({
            balance: (parseFloat(existingBalance.balance) + body.grantedDays).toString(),
          }).where(eq(leaveBalances.id, existingBalance.id));
        } else {
          await tx.insert(leaveBalances).values({
            orgId: session.orgId,
            userId: hwr.userId,
            leaveTypeId: compOffType.id,
            balance: body.grantedDays.toString(),
            year: currentYear,
          });
        }
      }

      return [g];
    });

    void createNotification({
      userId: hwr.userId,
      orgId: session.orgId,
      title: "Comp-off granted",
      message: `${body.grantedDays} comp-off day(s) granted for working on ${hwr.requestDate}. Valid until ${expiryStr}.`,
      link: "/hr/leaves",
    }).catch(() => {});

    return ok(grant);
  });
}
