"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useProject, useTicketByKey } from "@/lib/hooks/trpc-hooks";
import { TicketDetailBody } from "@/components/projects/ticket-details/ticket-detail-body";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function TicketPage({ params }: { params: Promise<{ projectId: string; ticketKey: string }> }) {
  const { projectId: rawProjectId, ticketKey } = use(params);
  const projectId = /^\d+$/.test(rawProjectId) ? Number(rawProjectId) : 0;
  const router = useRouter();
  const lookup = useTicketByKey(projectId, ticketKey);
  const { data: project } = useProject(projectId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-3 sm:px-6">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:focus-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to board
        </Link>
      </div>
      {lookup.isLoading ? (
        <div className="space-y-4 p-6" aria-busy="true">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : lookup.data ? (
        <div className="mx-auto w-full max-w-6xl flex-1 overflow-hidden rounded-xl border border-border bg-card sm:m-4">
          <TicketDetailBody
            projectId={projectId}
            ticketId={lookup.data.id}
            statuses={project?.statuses?.map((s) => ({ id: s.id, name: s.name }))}
            variant="page"
            onArchived={() => router.push(`/projects/${projectId}`)}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            title="This ticket doesn't exist, or you don't have access"
            description={`We couldn't find ${decodeURIComponent(ticketKey)} in this project.`}
            action={{ label: "Back to board", href: `/projects/${projectId}` }}
          />
        </div>
      )}
    </div>
  );
}
