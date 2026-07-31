import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectTemplates, projectTemplateTickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ticketSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.string().default("TASK"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  estimatedHours: z.number().positive().optional(),
  order: z.number().int().default(0),
  phase: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().default("GENERAL"),
  tickets: z.array(ticketSchema).default([]),
});

export async function GET() {
  return withAuth(async (session) => {
    const templates = await db.query.projectTemplates.findMany({
      where: eq(projectTemplates.orgId, session.orgId),
      with: { tickets: { orderBy: (t, { asc }) => [asc(t.order)] } },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    return ok(templates);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);
    

    const [template] = await db
      .insert(projectTemplates)
      .values({
        orgId: session.orgId,
        name: input.name,
        description: input.description,
        category: input.category,
        createdBy: session.user.id,
      })
      .returning();

    if (!template) return err("Failed to create template", 500);

    if (input.tickets.length > 0) {
      await db.insert(projectTemplateTickets).values(
        input.tickets.map((t, i) => ({
          templateId: template.id,
          title: t.title,
          description: t.description,
          type: t.type,
          priority: t.priority,
          estimatedHours: t.estimatedHours ? String(t.estimatedHours) : null,
          order: t.order ?? i,
          phase: t.phase,
        })),
      );
    }

    const full = await db.query.projectTemplates.findFirst({
      where: eq(projectTemplates.id, template.id),
      with: { tickets: { orderBy: (t, { asc }) => [asc(t.order)] } },
    });

    return ok(full, 201);
  });
}
