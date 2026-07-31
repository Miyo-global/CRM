import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clientOnboardingItems, clients } from "@/lib/db/schema/crm";
import { users } from "@/lib/db/schema/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const ONBOARDING_MUTATE_ROLES = new Set(["CEO", "HR", "ADMIN", "CUSTOMER_SUPPORT", "SALES"]);

const listSchema = z.object({
  clientId: z.coerce.number().optional(),
});

const createSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  sortOrder: z.coerce.number().int().optional().default(0),
  templateId: z.coerce.number().int().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { clientId } = parseQuery(req, listSchema);

    const baseConditions = [eq(clientOnboardingItems.orgId, session.orgId)];
    if (clientId) {
      baseConditions.push(eq(clientOnboardingItems.clientId, clientId));
    }

    const items = await db
      .select({
        id: clientOnboardingItems.id,
        orgId: clientOnboardingItems.orgId,
        clientId: clientOnboardingItems.clientId,
        templateId: clientOnboardingItems.templateId,
        title: clientOnboardingItems.title,
        description: clientOnboardingItems.description,
        assignedTo: clientOnboardingItems.assignedTo,
        dueDate: clientOnboardingItems.dueDate,
        completedAt: clientOnboardingItems.completedAt,
        completedBy: clientOnboardingItems.completedBy,
        sortOrder: clientOnboardingItems.sortOrder,
        createdAt: clientOnboardingItems.createdAt,
        updatedAt: clientOnboardingItems.updatedAt,
        assignee: {
          id: users.id,
          name: users.name,
        },
      })
      .from(clientOnboardingItems)
      .leftJoin(users, eq(clientOnboardingItems.assignedTo, users.id))
      .where(and(...baseConditions))
      .orderBy(clientOnboardingItems.sortOrder, clientOnboardingItems.createdAt);

    return ok(items);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!ONBOARDING_MUTATE_ROLES.has(role)) {
      return err("Only CRM team can manage onboarding items", 403);
    }

    const body = await parseBody(req, createSchema);

    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, body.clientId), eq(clients.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!client) return err("Client not found", 404);

    const [item] = await db
      .insert(clientOnboardingItems)
      .values({
        orgId: session.orgId,
        clientId: body.clientId,
        title: body.title,
        description: body.description ?? null,
        assignedTo: body.assignedTo ?? null,
        dueDate: body.dueDate ?? null,
        sortOrder: body.sortOrder,
        templateId: body.templateId ?? null,
      })
      .returning();

    return ok(item, 201);
  });
}
