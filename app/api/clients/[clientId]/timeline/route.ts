import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clients, deals, dealActivities, leadActivities, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

type Ctx = { params: Promise<{ clientId: string }> };

interface TimelineEvent {
  id: string;
  type: "deal_created" | "deal_stage_change" | "call" | "email" | "meeting" | "note" | "conversion";
  title: string;
  description: string;
  date: string;
  user?: string;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { clientId: id } = await ctx.params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) return err("Invalid client id", 400);

  return withAuth(async (session) => {
    const [client] = await db.select().from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.orgId, session.orgId)));
    if (!client) return err("Client not found", 404);

    const events: TimelineEvent[] = [];

    if (client.convertedAt) {
      events.push({
        id: `conversion-${clientId}`,
        type: "conversion",
        title: "Client converted",
        description: `${client.name} was converted from lead to client`,
        date: new Date(client.convertedAt).toISOString(),
      });
    }

    const clientDeals = await db.select({ id: deals.id, name: deals.name, createdAt: deals.createdAt })
      .from(deals)
      .where(and(eq(deals.orgId, session.orgId), eq(deals.clientId, clientId)));

    for (const deal of clientDeals) {
      events.push({
        id: `deal-${deal.id}`,
        type: "deal_created",
        title: `Deal created: ${deal.name}`,
        description: `New deal associated with this client`,
        date: deal.createdAt ? new Date(deal.createdAt).toISOString() : new Date().toISOString(),
      });
    }

    const dealIds = clientDeals.map((d) => d.id);
    if (dealIds.length > 0) {
      const activities = await db
        .select({
          id: dealActivities.id,
          type: dealActivities.type,
          subject: dealActivities.subject,
          notes: dealActivities.notes,
          createdAt: dealActivities.createdAt,
          userName: users.name,
        })
        .from(dealActivities)
        .leftJoin(users, eq(dealActivities.userId, users.id))
        .where(and(eq(dealActivities.orgId, session.orgId), inArray(dealActivities.dealId, dealIds)))
        .orderBy(desc(dealActivities.createdAt))
        .limit(dealIds.length * 10);

      for (const act of activities) {
        events.push({
          id: `deal-act-${act.id}`,
          type: act.type as TimelineEvent["type"],
          title: act.subject || `${act.type} logged`,
          description: act.notes || "",
          date: act.createdAt ? new Date(act.createdAt).toISOString() : new Date().toISOString(),
          user: act.userName ?? undefined,
        });
      }
    }

    if (client.leadId) {
      const leadActs = await db
        .select({
          id: leadActivities.id,
          type: leadActivities.type,
          subject: leadActivities.subject,
          notes: leadActivities.notes,
          date: leadActivities.date,
          userName: users.name,
        })
        .from(leadActivities)
        .leftJoin(users, eq(leadActivities.userId, users.id))
        .where(and(eq(leadActivities.orgId, session.orgId), eq(leadActivities.leadId, client.leadId)))
        .orderBy(desc(leadActivities.date))
        .limit(10);

      for (const act of leadActs) {
        events.push({
          id: `lead-act-${act.id}`,
          type: act.type as TimelineEvent["type"],
          title: act.subject || `${act.type} (pre-conversion)`,
          description: act.notes || "",
          date: new Date(act.date).toISOString(),
          user: act.userName ?? undefined,
        });
      }
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return ok({ events, total: events.length });
  });
}
