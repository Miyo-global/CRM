import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers, invitations, projects, projectMembers } from "@/lib/db/schema";
import { normalizeProjectRole } from "@/lib/projects/project-roles";
import { eq, and, gt, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { generateNextEmployeeId } from "@/lib/hr/generate-employee-id";
import { hashToken } from "@/lib/secret-crypto";
import { PASSWORD_ZOD_SCHEMA, passwordIdentityIssue } from "@/lib/utils/password-validation";
import { ACCOUNT_EXISTS_MESSAGE, findAccountByEmail, revokePendingInvitations } from "@/lib/org/email-identity";

const schema = z.object({
  token: z.string(),
  // One policy, shared with the client, instead of an inline 8-character rule
  // over a narrow character set (QA-0067).
  password: PASSWORD_ZOD_SCHEMA,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch (error) {
    // A weak password used to return the same opaque message as a bad token
    // (QA-0067).
    if (error instanceof z.ZodError) {
      const passwordIssue = error.issues.find((issue) => issue.path[0] === "password");
      if (passwordIssue) {
        return err(passwordIssue.message, 400);
      }
    }
    return err("Invalid request body", 400);
  }

  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.token, hashToken(input.token)),
      gt(invitations.expiresAt, new Date()),
      isNull(invitations.acceptedAt)
    ),
  });

  if (!invitation) return err("Invalid or expired invitation", 400);

  // R3-ONB-07: the person may have been onboarded another way since the
  // invite went out. Say so, and retire the stale link(s) for this address.
  if (await findAccountByEmail(invitation.email)) {
    await revokePendingInvitations(invitation.orgId, invitation.email);
    return err(ACCOUNT_EXISTS_MESSAGE, 409);
  }

  const identityIssue = passwordIdentityIssue(input.password, { email: invitation.email, firstName: input.firstName, lastName: input.lastName });
  if (identityIssue) return err(identityIssue, 400);

  const hashedPassword = await bcrypt.hash(input.password, 12);
  const userId = nanoid();
  const fullName =
    input.firstName && input.lastName
      ? `${input.firstName} ${input.lastName}`
      : input.firstName || input.lastName || null;

  const employeeId = invitation.role !== "CEO"
    ? await generateNextEmployeeId(new Date())
    : undefined;

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      email: invitation.email,
      password: hashedPassword,
      name: fullName,
      firstName: input.firstName,
      lastName: input.lastName,
      emailVerified: new Date(),
      role: invitation.role,
      // The column defaults to off for HR-created records; someone who was
      // deliberately invited should land in the app, not on "Portal Access
      // Restricted" (QA-BUG-04).
      hasDashboardAccess: true,
      ...(employeeId ? { employeeId } : {}),
    });

    await tx.insert(organizationMembers).values({
      userId,
      orgId: invitation.orgId,
      role: invitation.role,
    });

    if (invitation.projectId) {
      const project = await tx.query.projects.findFirst({
        where: and(eq(projects.id, invitation.projectId), eq(projects.orgId, invitation.orgId), isNull(projects.deletedAt)),
        columns: { id: true },
      });
      if (project) {
        await tx
          .insert(projectMembers)
          .values({ projectId: project.id, userId, role: normalizeProjectRole(invitation.projectRole) })
          .onConflictDoNothing();
      }
    }

    await tx
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
  });

  logger.info("Auth: invitation accepted", { email: invitation.email, orgId: invitation.orgId });
  return ok({ success: true });
}
