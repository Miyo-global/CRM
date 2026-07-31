import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clientOpportunities, clients } from "@/lib/db/schema";
import { eq, and, type SQL } from "drizzle-orm";
import { z } from "zod";
import { type NextRequest } from "next/server";

const createSchema = z.object({
  clientId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  type: z.enum(["upsell", "cross_sell"]).default("upsell"),
  stage: z.enum(["identified", "proposed", "negotiating", "won", "lost"]).default("identified"),
  value: z.string().optional(),
  notes: z.string().max(2000).optional(),
  expectedCloseDate: z.string().optional(),
});


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const clientIdParam = req.nextUrl.searchParams.get("clientId");
    const clientId = clientIdParam ? Number(clientIdParam) : undefined;

    const conditions: SQL[] = [eq(clientOpportunities.orgId, session.orgId)];
    if (clientId) {
      conditions.push(eq(clientOpportunities.clientId, clientId));
    }

    const rows = await db
      .select({
        id: clientOpportunities.id,
        orgId: clientOpportunities.orgId,
        clientId: clientOpportunities.clientId,
        title: clientOpportunities.title,
        type: clientOpportunities.type,
        stage: clientOpportunities.stage,
        value: clientOpportunities.value,
        notes: clientOpportunities.notes,
        expectedCloseDate: clientOpportunities.expectedCloseDate,
        createdBy: clientOpportunities.createdBy,
        createdAt: clientOpportunities.createdAt,
        updatedAt: clientOpportunities.updatedAt,
        client: {
          id: clients.id,
          name: clients.name,
        },
      })
      .from(clientOpportunities)
      .leftJoin(clients, eq(clientOpportunities.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(clientOpportunities.createdAt)
      .limit(500);

    return ok(rows);
  });
}


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Invalid input", 400);

    const { clientId, title, type, stage, value, notes, expectedCloseDate } = parsed.data;

    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, clientId), eq(clients.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!client) return err("Client not found", 404);

    const [inserted] = await db
      .insert(clientOpportunities)
      .values({
        orgId: session.orgId,
        clientId,
        title,
        type,
        stage,
        value: value ?? null,
        notes: notes ?? null,
        expectedCloseDate: expectedCloseDate ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(inserted, 201);
  });
}
