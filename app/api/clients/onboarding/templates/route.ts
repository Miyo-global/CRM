import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { clientOnboardingTemplates } from "@/lib/db/schema/crm";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const templates = await db
      .select()
      .from(clientOnboardingTemplates)
      .where(eq(clientOnboardingTemplates.orgId, session.orgId));
    return ok(templates);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden: admin access required", 403);
    }

    const body = await parseBody(req, createSchema);

    const [template] = await db
      .insert(clientOnboardingTemplates)
      .values({
        orgId: session.orgId,
        name: body.name,
        description: body.description ?? null,
        isDefault: body.isDefault,
        createdBy: session.user.id,
      })
      .returning();

    return ok(template, 201);
  });
}
