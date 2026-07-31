"server-only";

import { db } from "@/lib/db";
import {
  leads,
  leadActivities,
  leadNotes,
  leadTasks,
  leadEmails,
} from "@/lib/db/schema";
import {
  eq,
  and,
  desc,
} from "drizzle-orm";

export async function getLead(orgId: string, id: number) {
  return db.query.leads.findFirst({
    where: and(eq(leads.id, id), eq(leads.orgId, orgId)),
    with: {
      assignedTo: { columns: { id: true, name: true, image: true, email: true } },
      assignedBy: { columns: { id: true, name: true } },
      campaign: { columns: { id: true, name: true } },
      activities: {
        with: { user: { columns: { id: true, name: true, image: true } } },
        orderBy: [desc(leadActivities.date)],
      },
    },
  });
}

export async function getLeadActivities(
  orgId: string,
  leadId: number,
  limit = 20
) {
  return db.query.leadActivities.findMany({
    where: and(
      eq(leadActivities.leadId, leadId),
      eq(leadActivities.orgId, orgId)
    ),
    with: { user: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(leadActivities.date)],
    limit,
  });
}

export async function getLeadTimeline(
  orgId: string,
  leadId: number,
  limit = 50
) {
  const [notes, tasks, emails, activities] = await Promise.all([
    db.query.leadNotes.findMany({
      where: and(eq(leadNotes.leadId, leadId), eq(leadNotes.orgId, orgId)),
      with: { author: { columns: { id: true, name: true } } },
      orderBy: desc(leadNotes.createdAt),
      limit,
    }),
    db.query.leadTasks.findMany({
      where: and(eq(leadTasks.leadId, leadId), eq(leadTasks.orgId, orgId)),
      orderBy: desc(leadTasks.createdAt),
      limit,
    }),
    db
      .select()
      .from(leadEmails)
      .where(and(eq(leadEmails.leadId, leadId), eq(leadEmails.orgId, orgId)))
      .orderBy(desc(leadEmails.sentAt))
      .limit(limit),
    db
      .select()
      .from(leadActivities)
      .where(
        and(
          eq(leadActivities.leadId, leadId),
          eq(leadActivities.orgId, orgId)
        )
      )
      .orderBy(desc(leadActivities.createdAt))
      .limit(limit),
  ]);

  type TimelineItem = {
    id: number;
    type: "note" | "task" | "email" | "activity";
    timestamp: Date | null;
    data: Record<string, unknown>;
  };

  const timeline: TimelineItem[] = [
    ...notes.map((n) => ({
      id: n.id,
      type: "note" as const,
      timestamp: n.createdAt,
      data: n as unknown as Record<string, unknown>,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      timestamp: t.createdAt,
      data: t as unknown as Record<string, unknown>,
    })),
    ...emails.map((e) => ({
      id: e.id,
      type: "email" as const,
      timestamp: e.sentAt,
      data: e as unknown as Record<string, unknown>,
    })),
    ...activities.map((a) => ({
      id: a.id,
      type: "activity" as const,
      timestamp: a.createdAt,
      data: a as unknown as Record<string, unknown>,
    })),
  ];

  timeline.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  });

  return timeline.slice(0, limit);
}
