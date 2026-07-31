import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getContact } from "@/server/queries/crm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  organizationId: z.number().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  twitterUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  leadId: z.number().nullable().optional(),
  dealId: z.number().nullable().optional(),
});

type Ctx = { params: Promise<{ contactId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { contactId: id } = await ctx.params;
  const contactId = Number(id);
  if (!Number.isFinite(contactId)) return err("Invalid contact id", 400);

  return withAuth(async (session) => {
    const contact = await getContact(session.orgId!, contactId);
    if (!contact) return err("Contact not found", 404);
    return ok(contact);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { contactId: id } = await ctx.params;
  const contactId = Number(id);
  if (!Number.isFinite(contactId)) return err("Invalid contact id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, updateSchema);

    const [updated] = await db.update(contacts)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(contacts.id, contactId), eq(contacts.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("Contact not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { contactId: id } = await ctx.params;
  const contactId = Number(id);
  if (!Number.isFinite(contactId)) return err("Invalid contact id", 400);

  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can delete contacts.", 403);
    }
    await db.delete(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.orgId, session.orgId!)));
    return ok({ success: true });
  });
}
