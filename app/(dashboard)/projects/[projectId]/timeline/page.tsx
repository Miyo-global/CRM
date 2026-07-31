"use client";

import { use, useMemo, useCallback } from "react";
import { useProject } from "@/lib/hooks/trpc-hooks";
import { GanttView } from "@/components/projects/gantt-view";
import { TicketDetailsDialog } from "@/components/projects/ticket-details/ticket-details-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound, useRouter, useSearchParams } from "next/navigation";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function TimelinePage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);
  const router = useRouter();
  const searchParams = useSearchParams();

  const ticketParam = searchParams.get("ticket");
  const parsedTicketId = ticketParam ? parseInt(ticketParam, 10) : null;
  const selectedTicketId =
    parsedTicketId != null && !Number.isNaN(parsedTicketId)
      ? parsedTicketId
      : null;

  const openTicket = useCallback(
    (ticketId: number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("ticket", String(ticketId));
      router.replace(`/projects/${projectId}/timeline?${p.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams, projectId]
  );

  const handleTicketClose = useCallback(
    (open: boolean) => {
      if (!open) {
        const p = new URLSearchParams(searchParams.toString());
        p.delete("ticket");
        const qs = p.toString();
        router.replace(
          qs
            ? `/projects/${projectId}/timeline?${qs}`
            : `/projects/${projectId}/timeline`,
          { scroll: false }
        );
      }
    },
    [router, searchParams, projectId]
  );

  const tickets = useMemo(() => {
    if (!data?.tickets) return [];
    return data.tickets.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status ?? "TODO",
      type: t.type ?? "TASK",
      startDate: t.startDate ?? null,
      dueDate: t.dueDate ?? null,
      createdAt: t.createdAt ?? null,
      updatedAt: t.updatedAt ?? null,
      ticketNumber: t.ticketNumber,
      sequenceId: t.sequenceId ?? null,
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            firstName: t.assignee.firstName ?? null,
            lastName: t.assignee.lastName ?? null,
          }
        : null,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <PageWrapper title="Timeline">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper title="Timeline" subtitle={`${tickets.length} tickets`}>
      <div className="h-full overflow-auto px-4 pb-4">
        <GanttView
          key={projectId}
          tickets={tickets}
          onTicketClick={openTicket}
        />
      </div>

      <TicketDetailsDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={handleTicketClose}
        projectId={projectId}
        statuses={data.statuses?.map((s) => ({ id: s.id, name: s.name }))}
      />
    </PageWrapper>
  );
}
