import { type NextRequest } from "next/server";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingTemplates, onboardingTemplateSteps } from "@/lib/db/schema";

export async function GET(_req: NextRequest) {
  return withAdmin(async (session) => {
    const templates = await db
      .select()
      .from(onboardingTemplates)
      .where(eq(onboardingTemplates.orgId, session.orgId))
      .orderBy(onboardingTemplates.createdAt);

    const templateIds = templates.map((t) => t.id);
    const steps =
      templateIds.length > 0
        ? await db
            .select()
            .from(onboardingTemplateSteps)
            .where(inArray(onboardingTemplateSteps.templateId, templateIds))
            .orderBy(onboardingTemplateSteps.sortOrder)
        : [];

    const stepsMap = new Map<number, (typeof steps)>();
    for (const step of steps) {
      const existing = stepsMap.get(step.templateId) ?? [];
      existing.push(step);
      stepsMap.set(step.templateId, existing);
    }

    const result = templates.map((t) => ({
      ...t,
      steps: stepsMap.get(t.id) ?? [],
    }));

    return ok(result);
  });
}

const stepSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ownerRole: z.string().default("NEW_HIRE"),
  dueOffsetDays: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
  isComplianceItem: z.boolean().default(false),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  departmentId: z.number().int().optional(),
  description: z.string().optional(),
  steps: z.array(stepSchema).default([]),
});

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createTemplateSchema);

    const [template] = await db
      .insert(onboardingTemplates)
      .values({
        orgId: session.orgId,
        name: body.name,
        departmentId: body.departmentId ?? null,
        description: body.description ?? null,
        isActive: true,
        createdBy: session.user.id,
      })
      .returning();

    if (!template) {
      throw new Error("Failed to create template");
    }

    if (body.steps.length > 0) {
      await db.insert(onboardingTemplateSteps).values(
        body.steps.map((step, i) => ({
          templateId: template.id,
          title: step.title,
          description: step.description ?? null,
          ownerRole: step.ownerRole,
          dueOffsetDays: step.dueOffsetDays,
          isRequired: step.isRequired,
          isComplianceItem: step.isComplianceItem,
          sortOrder: i,
        }))
      );
    }

    return ok({ success: true, templateId: template.id }, 201);
  });
}
