"use client";

import { useTicketActivity } from "@/lib/api/hooks/projects/activity";
import { ActivityList } from "@/features/projects/activity/activity-list";

export function TicketHistory({ projectId, ticketId }: { projectId: number; ticketId: number }) {
  const query = useTicketActivity(projectId, ticketId);
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</h2>
      <ActivityList query={query} />
    </section>
  );
}
