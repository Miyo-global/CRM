import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { webLeadForms } from "@/lib/db/schema/crm";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const fieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "email", "phone", "textarea", "select"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  fields: z.array(fieldSchema).optional(),
  submitMessage: z.string().optional(),
  redirectUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const id = Number(formId);
  if (Number.isNaN(id)) return err("Invalid form id", 400);
  return withAuth(async (session) => {
    const [form] = await db
      .select()
      .from(webLeadForms)
      .where(and(eq(webLeadForms.id, id), eq(webLeadForms.orgId, session.orgId)));

    if (!form) return err("Form not found", 404);
    return ok(form);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const id = Number(formId);
  if (Number.isNaN(id)) return err("Invalid form id", 400);
  return withAdmin(async (session) => {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    const [existing] = await db
      .select()
      .from(webLeadForms)
      .where(and(eq(webLeadForms.id, id), eq(webLeadForms.orgId, session.orgId)));

    if (!existing) return err("Form not found", 404);

    const [updated] = await db
      .update(webLeadForms)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(webLeadForms.id, id), eq(webLeadForms.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const id = Number(formId);
  if (Number.isNaN(id)) return err("Invalid form id", 400);
  return withAdmin(async (session) => {
    const [existing] = await db
      .select()
      .from(webLeadForms)
      .where(and(eq(webLeadForms.id, id), eq(webLeadForms.orgId, session.orgId)));

    if (!existing) return err("Form not found", 404);

    await db
      .delete(webLeadForms)
      .where(and(eq(webLeadForms.id, id), eq(webLeadForms.orgId, session.orgId)));
    return ok({ success: true });
  });
}
