import { db } from "@/lib/db";
import { bonuses, organizationMembers, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/server/actions/create-notification";
import {
  sendBonusPaidEmployeeEmail,
  sendBonusPaidStakeholderEmail,
} from "@/lib/email/hr-bonuses";
import { BONUS_MANAGE_ROLES } from "@/lib/constants/hr";
import { BONUS_TYPE_LABELS, type BonusType } from "@/lib/validations/bonus";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";
import { logger } from "@/lib/logger";

function formatBonusAmount(amount: string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function bonusTypeLabel(type: string | null | undefined): string {
  if (!type) return "Bonus";
  return BONUS_TYPE_LABELS[type as BonusType] ?? type;
}

export type BonusPaidNotificationResult = {
  employeeEmailSent: boolean;
  stakeholderEmailsSent: number;
};

export async function deliverBonusPaidNotifications(params: {
  orgId: string;
  bonusId: number;
  markedPaidByUserId: string;
  markedPaidByName: string;
}): Promise<BonusPaidNotificationResult> {
  const result: BonusPaidNotificationResult = {
    employeeEmailSent: false,
    stakeholderEmailsSent: 0,
  };

  const bonus = await db.query.bonuses.findFirst({
    where: and(eq(bonuses.id, params.bonusId), eq(bonuses.orgId, params.orgId)),
  });

  if (!bonus) {
    logger.warn("Bonus paid notifications skipped — bonus not found", { bonusId: params.bonusId });
    return result;
  }

  const employee = await db.query.users.findFirst({
    where: eq(users.id, bonus.userId),
    columns: { id: true, name: true, email: true },
  });

  const amount = formatBonusAmount(bonus.amount);
  const typeLabel = bonusTypeLabel(bonus.type);
  const employeeName = employee?.name ?? "Employee";
  const reasonLine = bonus.reason?.trim() ? ` Reason: ${bonus.reason.trim()}.` : "";

  try {
    await createAuditLog({
      action: "hr.bonus_paid",
      userId: params.markedPaidByUserId,
      orgId: params.orgId,
      targetId: String(params.bonusId),
      targetType: "bonus",
      metadata: {
        employeeId: bonus.userId,
        employeeName,
        amount: bonus.amount,
        type: bonus.type,
        reason: bonus.reason,
        markedBy: params.markedPaidByName,
      },
    });
  } catch (error) {
    logger.error("Failed to write bonus paid audit log", { bonusId: params.bonusId, error });
  }

  const employeeMessage = `Your ${typeLabel} bonus of ₹${amount} has been marked as paid.${reasonLine}`;

  try {
    await createNotification({
      orgId: params.orgId,
      userId: bonus.userId,
      type: "SUCCESS",
      title: "Bonus Paid",
      message: employeeMessage,
      link: "/hr/my-bonuses",
      metadata: { bonusId: params.bonusId, amount: bonus.amount, type: bonus.type },
    });
  } catch (error) {
    logger.error("Failed to create employee bonus paid notification", { bonusId: params.bonusId, error });
  }

  if (employee?.email) {
    try {
      await sendBonusPaidEmployeeEmail(employee.email, {
        employeeName,
        amount,
        typeLabel,
        reason: bonus.reason,
        markedByName: params.markedPaidByName,
      });
      result.employeeEmailSent = true;
    } catch (error) {
      logger.error("Failed to send bonus paid email to employee", {
        bonusId: params.bonusId,
        userId: bonus.userId,
        error,
      });
    }
  }

  const stakeholderMessage =
    `${params.markedPaidByName} marked a bonus as paid for ${employeeName}. ` +
    `Amount: ₹${amount} · Type: ${typeLabel}.${reasonLine}`;

  const managers = await db
    .select({ userId: organizationMembers.userId, email: users.email })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.orgId, params.orgId),
        inArray(organizationMembers.role, [...BONUS_MANAGE_ROLES]),
      ),
    );

  const managerTargets = managers.filter((m) => m.userId !== bonus.userId && m.email);

  for (const manager of managerTargets) {
    try {
      await createNotification({
        orgId: params.orgId,
        userId: manager.userId,
        type: "INFO",
        title: "Bonus Marked as Paid",
        message: stakeholderMessage,
        link: "/hr/bonuses",
        metadata: {
          bonusId: params.bonusId,
          employeeId: bonus.userId,
          employeeName,
          amount: bonus.amount,
          type: bonus.type,
          reason: bonus.reason,
          markedBy: params.markedPaidByName,
        },
      });
    } catch (error) {
      logger.error("Failed to create manager bonus paid notification", {
        bonusId: params.bonusId,
        userId: manager.userId,
        error,
      });
    }
  }

  const emailPayload = {
    employeeName,
    amount,
    typeLabel,
    reason: bonus.reason,
    markedByName: params.markedPaidByName,
  };

  const stakeholderEmails = new Set<string>(
    [
      ...managerTargets.map((m) => m.email as string),
      HR_NOTIFICATION_EMAIL,
    ].filter(Boolean),
  );

  await Promise.allSettled(
    [...stakeholderEmails].map(async (to) => {
      try {
        await sendBonusPaidStakeholderEmail(to, emailPayload);
        result.stakeholderEmailsSent += 1;
      } catch (error) {
        logger.error("Failed to send bonus paid stakeholder email", { to, bonusId: params.bonusId, error });
      }
    }),
  );

  return result;
}
