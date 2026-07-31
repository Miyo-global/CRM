"use server";

import { db } from "@/lib/db";
import {
  leaveRequests,
  leaveTypes,
  leaveBalances,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray, lte, gte, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { sendLeaveRequestEmail, sendLeaveStatusUpdateEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";
import { createNotification, notifyAllMembers, notifyByRoles } from "../create-notification";
import { ROLES, EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";
import { HR_LEAVE_NOTIFY_EMAIL } from "@/lib/constants/hr-leave-routing";
import { LEAVE_POLICY } from "@/lib/leave-policy";
import { formatDateOnly } from "@/lib/date-utils";
import { hasLeaveApproverRole } from "@/lib/auth/leave-approval-roles";

export async function getApprovers() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const targetRoles: string[] = member.role === ROLES.CEO
    ? [ROLES.HR, ROLES.ADMIN]
    : member.role === ROLES.HR
    ? [ROLES.CEO, ROLES.ADMIN]
    : [ROLES.ADMIN, ROLES.HR, ROLES.CEO];

  const approvers = await db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.orgId, member.orgId),
      inArray(organizationMembers.role, targetRoles),
    ),
    with: { user: true },
  });

  return approvers
    .filter((m) => m.userId !== session.user.id)
    .map((m) => m.user);
}

export async function submitLeaveRequest(data: {
  leaveTypeId: number;
  startDate: Date;
  endDate: Date;
  reason: string;
  priority?: string;
  approverId?: string | null;
  attachmentUrl?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: "AM" | "PM";
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return { error: "No organization found" };

  if (data.startDate > data.endDate) return { error: "Invalid date range" };

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { joiningDate: true },
  });
  if (userRecord?.joiningDate) {
    const doj = new Date(userRecord.joiningDate);
    if (data.startDate < doj) {
      return { error: "Leave dates cannot be before your Date of Joining" };
    }
  }

  const isCeo = member.role === ROLES.CEO;
  const startDateOnly = formatDateOnly(data.startDate);
  const endDateOnly = formatDateOnly(data.endDate);

  try {
    const validPriorities = new Set(["LOW", "MEDIUM", "HIGH"]);
    const priority = data.priority && validPriorities.has(data.priority) ? data.priority : "MEDIUM";

    const overlap = await db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.userId, session.user.id),
        eq(leaveRequests.orgId, member.orgId),
        inArray(leaveRequests.status, ["PENDING", "APPROVED"]),
        lte(leaveRequests.startDate, endDateOnly),
        gte(leaveRequests.endDate, startDateOnly),
      ),
      columns: { id: true },
    });
    if (overlap) {
      return { error: "You already have a pending or approved leave request that overlaps these dates." };
    }

    const leaveType = await db.query.leaveTypes.findFirst({ where: eq(leaveTypes.id, data.leaveTypeId) });

    let ceoDeduction: { balanceId: number; newBalance: number } | null = null;
    if (isCeo && leaveType?.name !== "Unpaid Leave") {
      let diffDays = data.isHalfDay ? 0.5 : 0;
      if (!data.isHalfDay) {
        const cursor = new Date(`${startDateOnly}T00:00:00Z`);
        const last = new Date(`${endDateOnly}T00:00:00Z`);
        while (cursor <= last) {
          const day = cursor.getUTCDay();
          if (day !== 0 && day !== 6) diffDays++;
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      }

      const balanceRecord = await db.query.leaveBalances.findFirst({
        where: and(
          eq(leaveBalances.userId, session.user.id),
          eq(leaveBalances.leaveTypeId, data.leaveTypeId),
          eq(leaveBalances.year, new Date().getFullYear()),
        ),
      });

      if (balanceRecord) {
        const newBalance = Number(balanceRecord.balance) - diffDays;
        if (newBalance < 0) {
          return { error: `Insufficient leave balance. Available: ${balanceRecord.balance}, Required: ${diffDays}` };
        }
        ceoDeduction = { balanceId: balanceRecord.id, newBalance };
      }
    }

    await db.transaction(async (tx) => {
      await tx.insert(leaveRequests).values({
        orgId: member.orgId,
        userId: session.user.id,
        leaveTypeId: data.leaveTypeId,
        startDate: startDateOnly,
        endDate: endDateOnly,
        reason: data.reason,
        priority,
        approverId: isCeo ? session.user.id : null,
        attachmentUrl: data.attachmentUrl || null,
        status: isCeo ? "APPROVED" : "PENDING",
        isHalfDay: data.isHalfDay ?? false,
        halfDayPeriod: data.isHalfDay ? (data.halfDayPeriod ?? "AM") : null,
      });
      if (ceoDeduction) {
        await tx
          .update(leaveBalances)
          .set({ balance: ceoDeduction.newBalance.toString() })
          .where(eq(leaveBalances.id, ceoDeduction.balanceId));
      }
    });

    if (isCeo) {

      await notifyAllMembers(member.orgId, {
        type: "INFO",
        title: "Team Member on Leave",
        message: `${session.user.name || "CEO"} will be on ${leaveType?.name || "leave"} from ${data.startDate.toLocaleDateString()} to ${data.endDate.toLocaleDateString()}.`,
        link: "/hr/leaves",
        excludeUserId: session.user.id,
      });
    } else {
      const leaveLabel = leaveType?.name || "Leave";
      const startStr = data.startDate.toLocaleDateString();
      const endStr = data.endDate.toLocaleDateString();
      const employeeName = session.user.name || "Employee";

      const hrMembers = await db.query.organizationMembers.findMany({
        where: and(
          eq(organizationMembers.orgId, member.orgId),
          eq(organizationMembers.role, ROLES.HR),
        ),
        columns: { userId: true },
      });

      const emailed = new Set<string>();
      for (const m of hrMembers) {
        const hrUser = await db.query.users.findFirst({
          where: eq(users.id, m.userId),
          columns: { email: true, name: true },
        });
        if (!hrUser?.email) continue;
        const key = hrUser.email.trim().toLowerCase();
        if (emailed.has(key)) continue;
        emailed.add(key);
        await sendLeaveRequestEmail(
          hrUser.email,
          hrUser.name || "HR",
          employeeName,
          leaveLabel,
          startStr,
          endStr,
          data.reason,
        );
      }

      const inboxKey = HR_LEAVE_NOTIFY_EMAIL.toLowerCase();
      if (!emailed.has(inboxKey)) {
        await sendLeaveRequestEmail(
          HR_LEAVE_NOTIFY_EMAIL,
          "HR",
          employeeName,
          leaveLabel,
          startStr,
          endStr,
          data.reason,
        );
      }

      await notifyByRoles(member.orgId, [ROLES.HR], {
        type: "WARNING",
        title: "Leave request pending",
        message: `${employeeName} requested ${leaveLabel} from ${startStr} to ${endStr}.`,
        link: "/hr/leaves",
        excludeUserId: session.user.id,
        email: false,
      });
    }

    revalidatePath("/hr/leaves");
    return { success: true };
  } catch (error) {
    logger.error("Failed to submit leave request", error);
    return { error: "Failed to submit request" };
  }
}

export async function processLeaveRequest(data: {
  requestId: number;
  status: "APPROVED" | "REJECTED" | "PENDING";
  rejectionReason?: string;
  forceApprove?: boolean;
  justification?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const request = await db.query.leaveRequests.findFirst({
    where: eq(leaveRequests.id, data.requestId),
  });
  if (!request) return { error: "Request not found" };

  if (request.userId === session.user.id) {
    return { error: "You cannot approve or reject your own leave request" };
  }

  if (request.approverId !== session.user.id) {
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!member || request.orgId !== member.orgId || !hasLeaveApproverRole(member.role)) {
      return { error: "Not authorized to process this request" };
    }
  }

  try {
    let lopDaysApplied = 0;
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(leaveRequests)
        .set({
          status: data.status,
          rejectionReason: data.status === "REJECTED" ? data.rejectionReason : null,
        })
        .where(eq(leaveRequests.id, data.requestId))
        .returning({ id: leaveRequests.id });
      if (updated.length === 0) {
        throw new Error("Leave request not found");
      }

      if (data.status === "PENDING" && request.status === "APPROVED" && request.leaveTypeId) {
        const leaveType = await tx.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, request.leaveTypeId),
          columns: { name: true },
        });
        if (leaveType?.name !== LEAVE_POLICY.UNPAID.name) {
          const start = new Date(request.startDate);
          const end = new Date(request.endDate);
          let diffDays = request.isHalfDay ? 0.5 : 0;
          if (!request.isHalfDay) {
            const cursor = new Date(start);
            while (cursor <= end) {
              const day = cursor.getDay();
              if (day !== 0 && day !== 6) diffDays++;
              cursor.setDate(cursor.getDate() + 1);
            }
          }
          const balanceRecord = await tx.query.leaveBalances.findFirst({
            where: and(
              eq(leaveBalances.userId, request.userId),
              eq(leaveBalances.leaveTypeId, request.leaveTypeId),
              eq(leaveBalances.year, new Date().getFullYear()),
            ),
          });
          if (balanceRecord) {
            const prevLopDays = Number(request.lopDays ?? 0);
            const paidDays = diffDays - prevLopDays;
            const restored = Number(balanceRecord.balance) + paidDays;
            await tx.update(leaveBalances).set({ balance: restored.toString() }).where(eq(leaveBalances.id, balanceRecord.id));
            await tx.update(leaveRequests).set({ lopDays: "0" }).where(eq(leaveRequests.id, data.requestId));
          }
        }
      }

      if (data.status === "APPROVED" && request.leaveTypeId) {
        const leaveType = await tx.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, request.leaveTypeId),
          columns: { name: true },
        });
        if (leaveType?.name !== LEAVE_POLICY.UNPAID.name) {
          const start = new Date(request.startDate);
          const end = new Date(request.endDate);
          let diffDays = request.isHalfDay ? 0.5 : 0;
          if (!request.isHalfDay) {
            const cursor = new Date(start);
            while (cursor <= end) {
              const day = cursor.getDay();
              if (day !== 0 && day !== 6) diffDays++;
              cursor.setDate(cursor.getDate() + 1);
            }
          }

          const balanceRecord = await tx.query.leaveBalances.findFirst({
            where: and(
              eq(leaveBalances.userId, request.userId),
              eq(leaveBalances.leaveTypeId, request.leaveTypeId),
              eq(leaveBalances.year, new Date().getFullYear()),
            ),
          });

          if (balanceRecord) {
            const available = Number(balanceRecord.balance);
            const lopDays = available <= 0 ? diffDays : Math.max(0, diffDays - available);
            const paidDays = diffDays - lopDays;
            const newBal = Math.max(0, available - paidDays);

            lopDaysApplied = lopDays;
            await tx.update(leaveRequests)
              .set({ lopDays: lopDays.toString() })
              .where(eq(leaveRequests.id, data.requestId));
            await tx.update(leaveBalances)
              .set({ balance: newBal.toString() })
              .where(eq(leaveBalances.id, balanceRecord.id));
          }
        }
      }
    });

    const [employee, leaveType, approver] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, request.userId) }),
      db.query.leaveTypes.findFirst({ where: eq(leaveTypes.id, request.leaveTypeId!) }),
      db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
    ]);

    if (employee?.email && (data.status === "APPROVED" || data.status === "REJECTED")) {
      await sendLeaveStatusUpdateEmail(
        employee.email,
        employee.name || "Employee",
        leaveType?.name || "Leave",
        new Date(request.startDate).toLocaleDateString(),
        new Date(request.endDate).toLocaleDateString(),
        data.status,
        approver?.name || "Manager",
        data.rejectionReason,
      );
    }

    const notifTitle = data.status === "PENDING"
      ? "Leave Reverted to Pending"
      : `Leave ${data.status === "APPROVED" ? "Approved" : "Rejected"}`;
    const notifType = data.status === "APPROVED" ? "SUCCESS" : data.status === "REJECTED" ? "ERROR" : "INFO";

    await createNotification({
      orgId: request.orgId,
      userId: request.userId,
      type: notifType,
      title: notifTitle,
      message: `Your leave request has been ${data.status === "APPROVED" ? "approved" : "rejected"} by ${approver?.name || "a manager"}.${lopDaysApplied > 0 ? ` Note: ${lopDaysApplied} day(s) will be Loss of Pay (LOP) due to insufficient balance.` : ""}${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ""}`,
      link: "/hr/leaves",
    });
    if (data.status === "APPROVED" && employee) {
      await notifyAllMembers(request.orgId, {
        type: "INFO",
        title: "Team Member on Leave",
        message: `${employee.name || "A team member"} will be on ${leaveType?.name || "leave"} from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()}.`,
        link: "/hr/leaves",
        excludeUserId: request.userId,
      });
    }

    await createAuditLog({
      action: data.status === "APPROVED" ? "hr.leave_approved" : "hr.leave_rejected",
      userId: session.user.id,
      orgId: request.orgId,
      targetId: String(data.requestId),
      targetType: "leave_request",
      metadata: { status: data.status, rejectionReason: data.rejectionReason },
    });

    revalidatePath("/hr/leaves");
    return { success: true };
  } catch (error) {
    logger.error("Failed to process leave request", error);
    return { error: "Failed to process request" };
  }
}

export async function getMyRequests() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  return await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.userId, session.user.id),
      eq(leaveRequests.orgId, member.orgId)
    ),
    with: {
      leaveType: true,
      approver: true,
    },
    orderBy: [desc(leaveRequests.createdAt)],
  });
}

export async function getIncomingRequests() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const isAdminRole = EXPENSE_ADMIN_ROLES.includes(member.role);

  return await db.query.leaveRequests.findMany({
    where: and(

      ...(isAdminRole
        ? [eq(leaveRequests.orgId, member.orgId)]
        : [eq(leaveRequests.approverId, session.user.id), eq(leaveRequests.orgId, member.orgId)]
      ),
      eq(leaveRequests.status, "PENDING"),
    ),
    with: {
      user: true,
      leaveType: true,
    },
    orderBy: [desc(leaveRequests.createdAt)],
  });
}

export async function getPendingApprovalCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return 0;

  const isAdminRole = EXPENSE_ADMIN_ROLES.includes(member.role);

  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.orgId, member.orgId),
        eq(leaveRequests.status, "PENDING"),
        ne(leaveRequests.userId, session.user.id),
        ...(isAdminRole
          ? []
          : [eq(leaveRequests.approverId, session.user.id)]),
      ),
    );

  return Number(count[0]?.count || 0);
}

export async function getAllIncomingRequests() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const isAdminRole = EXPENSE_ADMIN_ROLES.includes(member.role);

  return await db.query.leaveRequests.findMany({
    where: and(
      ...(isAdminRole
        ? [eq(leaveRequests.orgId, member.orgId)]
        : [eq(leaveRequests.approverId, session.user.id), eq(leaveRequests.orgId, member.orgId)]
      ),
    ),
    with: {
      user: true,
      leaveType: true,
      approver: true,
    },
    orderBy: [desc(leaveRequests.createdAt)],
  });
}

export async function cancelLeaveRequest(requestId: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const request = await db.query.leaveRequests.findFirst({
    where: eq(leaveRequests.id, requestId),
  });
  if (!request) return { error: "Request not found" };

  if (request.userId !== session.user.id) {
    return { error: "You can only cancel your own leave requests" };
  }
  if (request.status !== "PENDING") {
    return { error: "Only pending leave requests can be cancelled" };
  }

  try {
    await db
      .update(leaveRequests)
      .set({ status: "CANCELLED" })
      .where(eq(leaveRequests.id, requestId));

    revalidatePath("/hr/leaves");
    return { success: true };
  } catch (error) {
    logger.error("Failed to cancel leave request", error);
    return { error: "Failed to cancel request" };
  }
}

export async function getApprovedLeavesThisWeek() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return [];

  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.orgId, member.orgId),
      eq(leaveRequests.status, "APPROVED"),
      lte(leaveRequests.startDate, weekEnd.toISOString()),
      gte(leaveRequests.endDate, weekStart.toISOString()),
    ),
    with: {
      user: true,
      leaveType: true,
    },
    orderBy: [desc(leaveRequests.startDate)],
  });
}
