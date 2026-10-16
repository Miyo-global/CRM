"use client";

import { use } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, Flag } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { usePortalProject } from "@/lib/api/hooks/projects/portal";
import { isDoneStatus } from "@/lib/projects/project-health";
import { PortalRequestForm } from "@/features/projects/client-portal/portal-request-form";
import { useSession } from "next-auth/react";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { getErrorMessage } from "@/lib/get-error-message";

export default function PortalProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: raw } = use(params);
  const projectId = /^\d+$/.test(raw) ? Number(raw) : 0;
  const { data, isLoading, error } = usePortalProject(projectId);
  const { data: session } = useSession();
  const isAdmin = isAdminOrOwner(session?.user?.role);
  // A disabled portal answered 403 and the page showed the generic
  // "doesn't exist" message (QA-D013).
  const portalOff = /client portal is turned off/i.test(
    error ? getErrorMessage(error) : "",
  );

  if (isLoading) {
    return (
      <PageWrapper title="Project">
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }
  if (portalOff) {
    return (
      <PageWrapper title="Client portal">
        <EmptyState
          title="The client portal is turned off"
          description={
            isAdmin
              ? "Turn it on under Settings → Organization to share projects with clients again."
              : "Your team has disabled client access for now. Ask them to turn it back on."
          }
          action={
            isAdmin
              ? { label: "Open organization settings", href: "/settings/organization" }
              : undefined
          }
        />
      </PageWrapper>
    );
  }

  if (!data?.project) {
    return (
      <PageWrapper title="Project">
        <EmptyState
          title="This project doesn't exist, or you don't have access"
          description="Ask the team to share it with you again."
          action={{ label: "Back to shared projects", href: "/portal" }}
        />
      </PageWrapper>
    );
  }

  const { project, capabilities, milestones, tickets } = data;
  return (
    <PageWrapper title={project.name} subtitle={project.description ?? undefined}>
      <div className="grid gap-4 lg:grid-cols-2">
        {capabilities.canViewMilestones && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Milestones</h2>
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No milestones shared yet.</p>
            ) : (
              <ol className="space-y-2">
                {milestones.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 text-sm">
                    <Flag className={m.status === "ACHIEVED" ? "size-4 text-success-strong" : "size-4 text-muted-foreground"} aria-hidden="true" />
                    <span className="flex-1">{m.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{format(new Date(m.targetDate), "MMM d, yyyy")}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
        {capabilities.canViewTasks && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Work in progress</h2>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No work shared yet.</p>
            ) : (
              <ul className="space-y-2">
                {tickets.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 text-sm">
                    {isDoneStatus(t.status) ? (
                      <CheckCircle2 className="size-4 text-success-strong" aria-hidden="true" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="flex-1">{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.status.replace(/_/g, " ").toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {capabilities.canSubmitRequests && (
          <section className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold">Send a request</h2>
            <PortalRequestForm projectId={projectId} />
          </section>
        )}
      </div>
    </PageWrapper>
  );
}
