import "server-only";

import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { RECRUITMENT_HR_ROLES } from "@/lib/constants/roles";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";
import { sendEmail } from "./sender";
import {
  getAssetAssignedEmailTemplate,
  getAssetAssignedHrNotificationTemplate,
} from "../email-templates";

export async function sendAssetAssignedEmail(
  email: string,
  employeeName: string,
  assetName: string,
  assetType: string,
  serialNumber: string | null,
) {
  await sendEmail({
    to: email,
    subject: `Asset Assigned: ${assetName}`,
    html: getAssetAssignedEmailTemplate(employeeName, assetName, assetType, serialNumber),
  });
}

export async function sendAssetAssignedHrEmail(
  hrEmail: string,
  hrName: string,
  assignerName: string,
  employeeName: string,
  assetName: string,
  assetType: string,
  serialNumber: string | null,
  assignedAt: string,
) {
  await sendEmail({
    to: hrEmail,
    subject: `Asset Assigned: ${assetName} → ${employeeName}`,
    html: getAssetAssignedHrNotificationTemplate(
      hrName,
      assignerName,
      employeeName,
      assetName,
      assetType,
      serialNumber,
      assignedAt,
    ),
  });
}

/** Active org members in HR-facing roles plus the shared HR inbox. */
export async function getAssetAssignmentHrRecipients(
  orgId: string,
): Promise<Array<{ email: string; name: string }>> {
  const rows = await db
    .select({ email: users.email, name: users.name })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        inArray(organizationMembers.role, [...RECRUITMENT_HR_ROLES]),
        eq(users.isActive, true),
      ),
    );

  const byEmail = new Map<string, string>();
  for (const row of rows) {
    const email = row.email?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, row.name?.trim() || "HR");
    }
  }

  const inboxKey = HR_NOTIFICATION_EMAIL.trim().toLowerCase();
  if (!byEmail.has(inboxKey)) {
    byEmail.set(inboxKey, "HR Team");
  }

  return [...byEmail.entries()].map(([email, name]) => ({ email, name }));
}

export async function notifyAssetAssignment(params: {
  orgId: string;
  assigneeUserId: string;
  assignerName: string;
  assetName: string;
  assetType: string;
  serialNumber: string | null;
}): Promise<void> {
  const assignedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const employee = await db.query.users.findFirst({
    where: eq(users.id, params.assigneeUserId),
    columns: { email: true, name: true },
  });
  const employeeName = employee?.name?.trim() || "Employee";

  if (employee?.email?.trim()) {
    await sendAssetAssignedEmail(
      employee.email.trim(),
      employeeName,
      params.assetName,
      params.assetType,
      params.serialNumber,
    );
  }

  const hrRecipients = await getAssetAssignmentHrRecipients(params.orgId);
  await Promise.all(
    hrRecipients.map((hr) =>
      sendAssetAssignedHrEmail(
        hr.email,
        hr.name,
        params.assignerName,
        employeeName,
        params.assetName,
        params.assetType,
        params.serialNumber,
        assignedAt,
      ),
    ),
  );
}
