import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers, invitations } from "@/lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { generateNextEmployeeId } from "@/lib/hr/generate-employee-id";
import { hashToken } from "@/lib/secret-crypto";

const schema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch {
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

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, invitation.email),
  });

  if (existingUser) return err("Invalid or expired invitation", 400);

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
      ...(employeeId ? { employeeId } : {}),
    });

    await tx.insert(organizationMembers).values({
      userId,
      orgId: invitation.orgId,
      role: invitation.role,
    });

    await tx
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
  });

  logger.info("Auth: invitation accepted", { email: invitation.email, orgId: invitation.orgId });
  return ok({ success: true });
}
