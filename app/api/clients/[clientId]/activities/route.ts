import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getClientActivities } from "@/server/queries/crm";
import { db } from "@/lib/db";
import { clientAccounts, clientAccountActivities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  activityType: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type Ctx = { params: Promise<{ clientId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { clientId: id } = await ctx.params;
  const accountId = Number(id);
  if (!Number.isFinite(accountId)) return err("Invalid client id", 400);

  return withAuth(async (session) => {
    const activities = await getClientActivities(session.orgId!, accountId);
    return ok(activities);
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { clientId: id } = await ctx.params;
  const accountId = Number(id);
  if (!Number.isFinite(accountId)) return err("Invalid client id", 400);

  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CUSTOMER_SUPPORT", "HR", "CEO"].includes(role)) {
      return err("Forbidden", 403);
    }

    const input = await parseBody(req, createSchema);
    const orgId = session.orgId!;

    const account = await db.query.clientAccounts.findFirst({
      where: and(eq(clientAccounts.id, accountId), eq(clientAccounts.orgId, orgId)),
      columns: { id: true },
    });
    if (!account) return err("Client account not found", 404);

    const [activity] = await db.insert(clientAccountActivities).values({
      clientAccountId: accountId,
      userId: session.user.id,
      activityType: input.activityType,
      title: input.title,
      description: input.description,
      metadata: input.metadata,
    }).returning();

    return ok(activity, 201);
  });
}
