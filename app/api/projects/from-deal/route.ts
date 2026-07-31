
import { NextRequest } from "next/server";
import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { deals, projects, projectMembers, projectStatuses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import { z } from "zod";

const fromDealSchema = z.object({
  dealId: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, fromDealSchema);

    const deal = await db.query.deals.findFirst({
      where: and(eq(deals.id, body.dealId), eq(deals.orgId, session.orgId)),
    });

    if (!deal) return err("Deal not found", 404);

    const namePart = body.name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const projectKey = (namePart.length >= 2 ? namePart : "PRJ") + "-" + randomPart;

    const [project] = await db
      .insert(projects)
      .values({
        orgId: session.orgId,
        key: projectKey,
        name: body.name,
        description: body.description ?? deal.notes ?? null,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate
          ? new Date(body.endDate)
          : deal.expectedCloseDate
          ? new Date(deal.expectedCloseDate)
          : undefined,
        status: "ACTIVE",
        dealId: body.dealId,
        managerId: deal.assignedToId ?? session.user.id,
        budget: deal.value ?? undefined,
        settings: {
          modules: {
            sprints: true,
            epics: true,
            timeTracking: true,
            wiki: true,
          },
        },
      })
      .returning();

    const defaultStatuses = [
      { name: "TODO", order: 0, color: "#e2e8f0" },
      { name: "IN_PROGRESS", order: 1, color: "#3b82f6" },
      { name: "IN_REVIEW", order: 2, color: "#eab308" },
      { name: "DONE", order: 3, color: "#22c55e" },
    ];

    await db.insert(projectStatuses).values(
      defaultStatuses.map((s) => ({
        orgId: session.orgId,
        projectId: project.id,
        name: s.name,
        order: s.order,
        color: s.color,
      }))
    );

    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: session.user.id,
      role: "OWNER",
    });

    await writeAuditLog({
      action: "project.created_from_deal",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(project.id),
      targetType: "project",
      metadata: { dealId: body.dealId, dealName: deal.name, projectKey },
    });

    return ok(project, 201);
  });
}
