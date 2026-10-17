import "server-only";

import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { RECRUITMENT_HR_ROLES } from "@/lib/constants/roles";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";
import { sendTemplateEmail } from "./sender";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/constants/locale";

/** MIYO-0272: the hand-written asset-assigned-employee template. */
export async function sendAssetAssignedEmail(
  email: string,
  asset: { name: string; tag: string; serialNumber: string | null; assignedOn: string },
) {
  await sendTemplateEmail("asset-assigned-employee", {
    to: email,
    vars: {
      asset_name: asset.name,
      asset_tag: asset.tag,
      serial_number: asset.serialNumber?.trim() || "not recorded",
      assigned_on: asset.assignedOn,
    },
  });
}

/** MIYO-0273: the hand-written asset-assigned-hr template. */
export async function sendAssetAssignedHrEmail(
  hrEmail: string | string[],
  asset: {
    name: string;
    tag: string;
    employeeName: string;
    assignedBy: string;
    assignedOn: string;
  },
) {
  await sendTemplateEmail("asset-assigned-hr", {
    to: hrEmail,
    category: "hr",
    vars: {
      asset_name: asset.name,
      asset_tag: asset.tag,
      employee_name: asset.employeeName,
      assigned_by: asset.assignedBy,
      assigned_on: asset.assignedOn,
    },
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
  assetTag: string;
  serialNumber: string | null;
}): Promise<void> {
  const assignedAt = new Date().toLocaleString(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIMEZONE,
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
    await sendAssetAssignedEmail(employee.email.trim(), {
      name: params.assetName,
      tag: params.assetTag,
      serialNumber: params.serialNumber,
      assignedOn: assignedAt,
    });
  }

  const hrRecipients = await getAssetAssignmentHrRecipients(params.orgId);
  await sendAssetAssignedHrEmail(
    hrRecipients.map((hr) => hr.email),
    {
      name: params.assetName,
      tag: params.assetTag,
      employeeName,
      assignedBy: params.assignerName,
      assignedOn: assignedAt,
    },
  );
}
