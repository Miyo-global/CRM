import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { webLeadForms } from "@/lib/db/schema/crm";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const fieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "email", "phone", "textarea", "select"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  fields: z.array(fieldSchema).default([]),
  submitMessage: z.string().optional(),
  redirectUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  return withAuth(async (session) => {
    const rows = await db
      .select()
      .from(webLeadForms)
      .where(eq(webLeadForms.orgId, session.orgId))
      .orderBy(webLeadForms.createdAt);

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    const { name, description, fields, submitMessage, redirectUrl, isActive } = parsed.data;

    const publicToken = crypto.randomUUID().replace(/-/g, "");

    const [created] = await db
      .insert(webLeadForms)
      .values({
        orgId: session.orgId,
        name,
        description: description ?? null,
        fields,
        publicToken,
        isActive,
        submitMessage: submitMessage ?? "Thank you! We'll be in touch soon.",
        redirectUrl: redirectUrl || null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}
