import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { customFieldDefinitions } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  entityType: z.enum(["lead", "deal", "contact"]),
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, {
    message: "Name must be snake_case (lowercase letters, digits, underscores only, starting with a letter)",
  }),
  label: z.string().min(1),
  fieldType: z.enum(["text", "number", "date", "boolean", "select"]).default("text"),
  options: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .optional(),
  isRequired: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET(req: NextRequest) {
  const entityType = req.nextUrl.searchParams.get("entityType") ?? undefined;

  return withAdmin(async (session) => {
    const where = entityType
      ? and(
          eq(customFieldDefinitions.orgId, session.orgId),
          eq(customFieldDefinitions.entityType, entityType)
        )
      : eq(customFieldDefinitions.orgId, session.orgId);

    const fields = await db
      .select()
      .from(customFieldDefinitions)
      .where(where)
      .orderBy(asc(customFieldDefinitions.sortOrder), asc(customFieldDefinitions.createdAt));

    return ok({ fields });
  });
}

export async function POST(req: NextRequest) {
  let data: z.infer<typeof createSchema>;
  try {
    const body = await req.json();
    data = createSchema.parse(body);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return err(e.issues.map((i) => i.message).join("; "), 400);
    }
    return err("Invalid request body", 400);
  }

  return withAdmin(async (session) => {
    const existing = await db
      .select({ id: customFieldDefinitions.id })
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.orgId, session.orgId),
          eq(customFieldDefinitions.entityType, data.entityType),
          eq(customFieldDefinitions.name, data.name)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return err(`A field named "${data.name}" already exists for ${data.entityType}`, 409);
    }

    const [created] = await db
      .insert(customFieldDefinitions)
      .values({
        orgId: session.orgId,
        entityType: data.entityType,
        name: data.name,
        label: data.label,
        fieldType: data.fieldType,
        options: data.options ?? null,
        isRequired: data.isRequired ?? false,
        isActive: true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: session.user.id,
      })
      .returning();

    return ok({ field: created }, 201);
  });
}
