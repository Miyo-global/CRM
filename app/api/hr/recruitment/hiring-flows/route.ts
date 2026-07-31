import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { hiringFlowTemplates, hiringFlowRounds } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { hiringFlowFormSchema } from "@/lib/validations/hiring-flow";
import type { NextRequest } from "next/server";

const createSchema = hiringFlowFormSchema;

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const templates = await db.query.hiringFlowTemplates.findMany({
      where: eq(hiringFlowTemplates.orgId, session.orgId),
      with: { rounds: { orderBy: [asc(hiringFlowRounds.roundOrder)] } },
    });
    return ok(templates);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Admins only.", 403);

    const body = await parseBody(req, createSchema);

    if (body.isDefault) {
      await db
        .update(hiringFlowTemplates)
        .set({ isDefault: false })
        .where(and(eq(hiringFlowTemplates.orgId, session.orgId), eq(hiringFlowTemplates.isDefault, true)));
    }

    const [template] = await db
      .insert(hiringFlowTemplates)
      .values({ orgId: session.orgId, name: body.name, description: body.description, isDefault: body.isDefault, createdBy: session.user.id })
      .returning();

    if (body.rounds.length > 0) {
      await db.insert(hiringFlowRounds).values(
        body.rounds.map((r) => ({ ...r, templateId: template.id, orgId: session.orgId })),
      );
    }

    const full = await db.query.hiringFlowTemplates.findFirst({
      where: eq(hiringFlowTemplates.id, template.id),
      with: { rounds: { orderBy: [asc(hiringFlowRounds.roundOrder)] } },
    });

    return ok(full, 201);
  });
}
