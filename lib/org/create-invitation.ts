import { and, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { invitations, organizationMembers, organizations, users } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";
import { hashToken } from "@/lib/secret-crypto";
import { checkRoleAssignment } from "@/lib/auth/role-assignment";
import { ACCOUNT_EXISTS_MESSAGE, findAccountByEmail } from "@/lib/org/email-identity";
import { EMAIL_ADDRESS_SCHEMA } from "@/lib/utils/email-validation";

type InviteInput = {
  orgId: string;
  email: string;
  role: string;
  invitedBy: string;
  /** Role of the inviter, so HR cannot invite someone straight in as CEO/ADMIN. */
  actorRole: string | null | undefined;
  projectId?: number;
  projectRole?: string;
};

export type InviteResult = { ok: true; invitationId: string } | { ok: false; status: 400 | 403 | 409; message: string };

export async function createOrgInvitation(input: InviteInput): Promise<InviteResult> {
  // Every caller routes through here, so the address rule lives here too
  // (R3-INV-10): 'a@b' or a 257-character address never becomes an invite.
  const parsedEmail = EMAIL_ADDRESS_SCHEMA.safeParse(input.email);
  if (!parsedEmail.success) {
    return { ok: false, status: 400, message: parsedEmail.error.issues[0]?.message ?? "Enter a valid email address" };
  }
  const email = parsedEmail.data;
  const roleError = await checkRoleAssignment({
    orgId: input.orgId,
    actorRole: input.actorRole,
    actorId: input.invitedBy,
    newRole: input.role,
  });
  if (roleError) return { ok: false, status: roleError.status, message: roleError.message };
  const role = input.role.trim().toUpperCase();
  // Accepting creates a new user, so an invite for any existing account could
  // never be used (R3-ONB-07); say so now instead of at the invitee's end.
  const existingUser = await findAccountByEmail(email);
  if (existingUser) {
    const existingMember = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.userId, existingUser.id), eq(organizationMembers.orgId, input.orgId)),
      columns: { id: true },
    });
    return { ok: false, status: 409, message: existingMember ? "User is already a member" : ACCOUNT_EXISTS_MESSAGE };
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
    role,
    invitedBy: input.invitedBy,
    expiresAt,
    projectId: input.projectId,
    projectRole: input.projectRole,
  });

  // QA-BUG-05: the first send had no inviter name; the resend did.
  const inviter = await db.query.users.findFirst({
    where: eq(users.id, input.invitedBy),
    columns: { name: true, firstName: true, lastName: true },
  });
  const inviterName =
    [inviter?.firstName, inviter?.lastName].filter(Boolean).join(" ") || inviter?.name || undefined;
  await sendInvitationEmail(email, token, org?.name ?? "Unknown Organization", {
    role,
    inviterName,
    expiresOn: expiresAt,
  }).catch(() => undefined);

  await createAuditLog({
    action: "org.member_invited",
    userId: input.invitedBy,
    orgId: input.orgId,
    targetId: invitationId,
    targetType: "invitation",
    metadata: { email, role, projectId: input.projectId },
  });

  return { ok: true, invitationId };
}
