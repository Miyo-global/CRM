import { withAuth, withHrEmailTemplateAccess, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { offerLetterCustomVariables } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isValidVariableKey } from "@/lib/hr/offer-letter-tokens";

const createSchema = z.object({
  variableKey: z
    .string()
    .trim()
    .min(1, "Variable key is required")
    .max(64, "Variable key must be 64 characters or less")
    .refine(isValidVariableKey, "Variable key must start with a letter and contain only letters, numbers, and underscores"),
  label: z.string().trim().min(1, "Label is required").max(120, "Label must be 120 characters or less"),
  description: z.string().trim().max(500, "Description must be 500 characters or less").optional(),
});

export async function GET() {
  return withHrEmailTemplateAccess(async (session) => {
    const data = await db
      .select()
      .from(offerLetterCustomVariables)
      .where(eq(offerLetterCustomVariables.orgId, session.orgId))
      .orderBy(desc(offerLetterCustomVariables.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const body = createSchema.parse(await req.json());

    const existing = await db.query.offerLetterCustomVariables.findFirst({
      where: and(
        eq(offerLetterCustomVariables.orgId, session.orgId),
        eq(offerLetterCustomVariables.variableKey, body.variableKey)
      ),
      columns: { id: true },
    });
    if (existing) return err(`A variable with key "${body.variableKey}" already exists.`, 409);

    const [record] = await db
      .insert(offerLetterCustomVariables)
      .values({
        orgId: session.orgId,
        variableKey: body.variableKey,
        label: body.label,
        description: body.description || null,
        createdById: session.user.id,
      })
      .returning();

    return ok(record, 201);
  });
}
