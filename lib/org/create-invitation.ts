import { and, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { invitations, organizationMembers, organizations, users } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";
import { hashToken } from "@/lib/secret-crypto";

type InviteInput = {
  orgId: string;
  email: string;
  role: string;
  invitedBy: string;
  projectId?: number;
  projectRole?: string;
};

export type InviteResult = { ok: true; invitationId: string } | { ok: false; status: 400 | 409; message: string };

export async function createOrgInvitation(input: InviteInput): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();
  const existingUser = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
  if (existingUser) {
    const existingMember = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.userId, existingUser.id), eq(organizationMembers.orgId, input.orgId)),
      columns: { id: true },
    });
    if (existingMember) return { ok: false, status: 409, message: "User is already a member" };
  }

  const pending = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.email, email),
      eq(invitations.orgId, input.orgId),
      gt(invitations.expiresAt, new Date()),
      isNull(invitations.acceptedAt),
    ),
    columns: { id: true },
  });
  if (pending) return { ok: false, status: 409, message: "An invitation has already been sent to this email" };

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, input.orgId),
    columns: { name: true, allowedEmailDomains: true },
  });
  if (org?.allowedEmailDomains && org.allowedEmailDomains.length > 0) {
    const domain = email.split("@")[1]?.toLowerCase();
    const allowed = org.allowedEmailDomains.map((d) => d.toLowerCase());
    if (!domain || !allowed.includes(domain)) {
      return { ok: false, status: 400, message: `Email domain not allowed. Permitted: ${org.allowedEmailDomains.join(", ")}` };
    }
  }

  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const invitationId = nanoid();

  await db.insert(invitations).values({
    id: invitationId,
    email,
    token: hashToken(token),
    orgId: input.orgId,
    role: input.role,
    invitedBy: input.invitedBy,
    expiresAt,
    projectId: input.projectId,
    projectRole: input.projectRole,
  });

  await sendInvitationEmail(email, token, org?.name ?? "Unknown Organization").catch(() => undefined);

  await createAuditLog({
    action: "org.member_invited",
    userId: input.invitedBy,
    orgId: input.orgId,
    targetId: invitationId,
    targetType: "invitation",
    metadata: { email, role: input.role, projectId: input.projectId },
  });

  return { ok: true, invitationId };
}
