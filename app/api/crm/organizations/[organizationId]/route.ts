import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmOrganizations, contacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { wouldCreateCycle } from "@/server/queries/crm-accounts";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
  description: z.string().optional().nullable(),
  healthScore: z.number().int().min(0).max(100).optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type Params = { params: Promise<{ organizationId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { organizationId } = await params;
  const id = Number(organizationId);
  if (!Number.isFinite(id)) return err("Invalid organizationId", 400);

  return withAuth(async (session) => {
    const [org] = await db
      .select()
      .from(crmOrganizations)
      .where(and(eq(crmOrganizations.id, id), eq(crmOrganizations.orgId, session.orgId)));

    if (!org) return err("Organization not found", 404);

    const orgContacts = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.orgId, session.orgId), eq(contacts.organizationId, id)));

    return ok({ ...org, contacts: orgContacts });
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { organizationId } = await params;
  const id = Number(organizationId);
  if (!Number.isFinite(id)) return err("Invalid organizationId", 400);

  return withAuth(async (session) => {
    const [existing] = await db
      .select({ id: crmOrganizations.id })
      .from(crmOrganizations)
      .where(and(eq(crmOrganizations.id, id), eq(crmOrganizations.orgId, session.orgId)));

    if (!existing) return err("Organization not found", 404);

    const input = await parseBody(req, updateSchema);

    if (input.parentId !== undefined && input.parentId !== null) {
      const cycle = await wouldCreateCycle(session.orgId, id, input.parentId);
      if (cycle) {
        return err(
          "Setting this parent would create a circular dependency. Choose a different parent.",
          400,
        );
      }
    }

    const [updated] = await db
      .update(crmOrganizations)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.domain !== undefined && { domain: input.domain }),
        ...(input.industry !== undefined && { industry: input.industry }),
        ...(input.size !== undefined && { size: input.size }),
        ...(input.website !== undefined && { website: input.website }),
        ...(input.linkedinUrl !== undefined && { linkedinUrl: input.linkedinUrl }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.healthScore !== undefined && { healthScore: input.healthScore }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.notes !== undefined && { notes: input.notes }),
        updatedAt: new Date(),
      })
      .where(and(eq(crmOrganizations.id, id), eq(crmOrganizations.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { organizationId } = await params;
  const id = Number(organizationId);
  if (!Number.isFinite(id)) return err("Invalid organizationId", 400);

  return withAuth(async (session) => {
    const [existing] = await db
      .select({ id: crmOrganizations.id })
      .from(crmOrganizations)
      .where(and(eq(crmOrganizations.id, id), eq(crmOrganizations.orgId, session.orgId)));

    if (!existing) return err("Organization not found", 404);

    await db.transaction(async (tx) => {
      await tx
        .update(contacts)
        .set({ organizationId: null })
        .where(and(eq(contacts.orgId, session.orgId), eq(contacts.organizationId, id)));

      await tx
        .delete(crmOrganizations)
        .where(and(eq(crmOrganizations.id, id), eq(crmOrganizations.orgId, session.orgId)));
    });

    return ok({ success: true });
  });
}
