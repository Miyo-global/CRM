"use server";

import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit-log";
import { isAdminOrOwner, isExpenseAdmin } from "@/lib/auth/helpers";
import { createNotification } from "@/server/actions/create-notification";
import { getExpenseMember } from "./_helpers";

export async function approveExpense(expenseId: number) {
  const ctx = await getExpenseMember();
  if (!ctx) return { error: "Unauthorized" };
  const { session, member } = ctx;

  if (!isExpenseAdmin(member.role)) {
    return { error: "Permission denied" };
  }

  try {

    const [updated] = await db.update(expenses)
      .set({
        status: "APPROVED",
        approverId: session.user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(expenses.id, expenseId),
        eq(expenses.orgId, member.orgId),
        eq(expenses.status, "PENDING")
      ))
      .returning();

    if (!updated) {
      return { error: "Expense is no longer pending or was not found" };
    }

    await createAuditLog({
      action: "expense.approved",
      userId: session.user.id,
      orgId: member.orgId,
      targetId: String(expenseId),
      targetType: "expense",
    });

    try {
      await createNotification({
        orgId: member.orgId,
        userId: updated.userId,
        type: "SUCCESS",
        title: "Expense Approved",
        message: `Your expense of ₹${parseFloat(updated.amount || "0").toLocaleString()} for "${updated.category}" has been approved.`,
        link: "/hr/expenses",
        metadata: { expenseId, amount: updated.amount, category: updated.category },
      });
    } catch (notifError) {
      logger.error("Failed to send expense approval notification", notifError);
    }

    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to approve expense", error);
    return { error: "Failed to approve expense" };
  }
}

export async function rejectExpense(expenseId: number, reason: string) {
  const ctx = await getExpenseMember();
  if (!ctx) return { error: "Unauthorized" };
  const { session, member } = ctx;

  if (!isExpenseAdmin(member.role)) {
    return { error: "Permission denied" };
  }

  try {

    const [rejected] = await db.update(expenses)
      .set({
        status: "REJECTED",
        approverId: session.user.id,
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(and(
        eq(expenses.id, expenseId),
        eq(expenses.orgId, member.orgId),
        eq(expenses.status, "PENDING")
      ))
      .returning();

    if (!rejected) {
      return { error: "Expense is no longer pending or was not found" };
    }

    await createAuditLog({
      action: "expense.rejected",
      userId: session.user.id,
      orgId: member.orgId,
      targetId: String(expenseId),
      targetType: "expense",
      metadata: { reason },
    });

    try {
      await createNotification({
        orgId: member.orgId,
        userId: rejected.userId,
        type: "ERROR",
        title: "Expense Rejected",
        message: `Your expense of ₹${parseFloat(rejected.amount || "0").toLocaleString()} for "${rejected.category}" has been rejected.`,
        link: "/hr/expenses",
        metadata: { expenseId, amount: rejected.amount, category: rejected.category, rejectionReason: reason },
      });
    } catch (notifError) {
      logger.error("Failed to send expense rejection notification", notifError);
    }

    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to reject expense", error);
    return { error: "Failed to reject expense" };
  }
}

export async function markExpenseAsPaid(expenseId: number, transactionRef?: string) {
  const ctx = await getExpenseMember();
  if (!ctx) return { error: "Unauthorized" };
  const { session, member } = ctx;

  if (!isAdminOrOwner(member.role)) {
    return { error: "Permission denied" };
  }

  try {
    const [paid] = await db.update(expenses)
      .set({
        status: "PAID",
        paidAt: new Date(),
        transactionRef,
        updatedAt: new Date(),
      })
      .where(and(
        eq(expenses.id, expenseId),
        eq(expenses.orgId, member.orgId),
        eq(expenses.status, "APPROVED")
      ))
      .returning();

    if (!paid) {
      return { error: "Expense is not approved or was not found" };
    }

    try {
      await createNotification({
        orgId: member.orgId,
        userId: paid.userId,
        type: "SUCCESS",
        title: "Expense Paid",
        message: `Your expense of ₹${parseFloat(paid.amount || "0").toLocaleString()} for "${paid.category}" has been paid.`,
        link: "/hr/expenses",
        metadata: { expenseId, amount: paid.amount, category: paid.category, transactionRef },
      });
    } catch (notifError) {
      logger.error("Failed to send expense paid notification", notifError);
    }

    revalidatePath("/hr/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to mark expense as paid", error);
    return { error: "Failed to mark expense as paid" };
  }
}
