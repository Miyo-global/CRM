"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TicketDetailBody } from "@/components/projects/ticket-details/ticket-detail-body";
import { useProject, useTicketByKey } from "@/lib/hooks/trpc-hooks";

/**
 * MIYO-0110: a ticket opened from the board slides in over it and the URL
 * becomes the ticket's own, so the link can be shared. Reloading that URL
 * leaves the slot empty and renders the full page instead.
 */
export default function TicketPanel({
  params,
}: {
  params: Promise<{ projectId: string; ticketKey: string }>;
}) {
  const { projectId: rawProjectId, ticketKey } = use(params);
  const projectId = /^\d+$/.test(rawProjectId) ? Number(rawProjectId) : 0;
  const router = useRouter();
  const lookup = useTicketByKey(projectId, ticketKey);
  const { data: project } = useProject(projectId);

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <SheetContent side="right" size="lg" className="gap-0 overflow-hidden p-0 max-sm:w-full max-sm:max-w-full">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {lookup.isLoading ? (
            <div className="space-y-4 p-6" aria-busy="true">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : lookup.data ? (
            <TicketDetailBody
              projectId={projectId}
              ticketId={lookup.data.id}
              statuses={project?.statuses?.map((s) => ({ id: s.id, name: s.name }))}
              variant="pane"
              onArchived={() => router.back()}
            />
          ) : (
            <EmptyState
              title="This ticket doesn't exist, or you don't have access"
              description={`We couldn't find ${decodeURIComponent(ticketKey)} in this project.`}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
