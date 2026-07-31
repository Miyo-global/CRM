import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { hiringFlowTemplates, hiringFlowRounds } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { hiringFlowFormSchema } from "@/lib/validations/hiring-flow";
import type { NextRequest } from "next/server";

const updateSchema = hiringFlowFormSchema.partial().extend({
  rounds: hiringFlowFormSchema.shape.rounds.optional(),
});

async function resolveTemplate(id: string, orgId: string) {
  const template = await db.query.hiringFlowTemplates.findFirst({
    where: and(eq(hiringFlowTemplates.id, Number(id)), eq(hiringFlowTemplates.orgId, orgId)),
    with: { rounds: { orderBy: [asc(hiringFlowRounds.roundOrder)] } },
  });
  return template ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await params;
    const template = await resolveTemplate(id, session.orgId);
    if (!template) return err("Not found.", 404);
    return ok(template);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Admins only.", 403);
    const { id } = await params;
    const template = await resolveTemplate(id, session.orgId);
    if (!template) return err("Not found.", 404);

    const body = await parseBody(req, updateSchema);

    if (body.isDefault) {
      await db
        .update(hiringFlowTemplates)
        .set({ isDefault: false })
        .where(and(eq(hiringFlowTemplates.orgId, session.orgId), eq(hiringFlowTemplates.isDefault, true)));
    }

    await db
      .update(hiringFlowTemplates)
      .set({ name: body.name ?? template.name, description: body.description ?? template.description, isDefault: body.isDefault ?? template.isDefault, updatedAt: new Date() })
      .where(eq(hiringFlowTemplates.id, Number(id)));

    if (body.rounds) {
      await db.delete(hiringFlowRounds).where(eq(hiringFlowRounds.templateId, Number(id)));
      await db.insert(hiringFlowRounds).values(
        body.rounds.map((r) => ({ ...r, templateId: Number(id), orgId: session.orgId })),
      );
    }

    return ok(await resolveTemplate(id, session.orgId));
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Admins only.", 403);
    const { id } = await params;
    const template = await resolveTemplate(id, session.orgId);
    if (!template) return err("Not found.", 404);
    await db.delete(hiringFlowTemplates).where(eq(hiringFlowTemplates.id, Number(id)));
    return ok({ deleted: true });
  });
}
