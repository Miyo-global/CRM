"use client";

import { memo } from "react";
import { Folder } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChip } from "@/components/ui/icon-chip";
import { StatusPill } from "@/components/ui/status-pill";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink, WidgetError } from "@/components/dashboard/widgets/view-all-link";
import type { Tone } from "@/lib/design/tones";

const projectStatusTone: Record<string, Tone> = {
  ACTIVE: "success",
  PLANNING: "info",
  COMPLETED: "neutral",
  ON_HOLD: "warning",
};

interface Project {
  id: number;
  name: string;
  key: string;
  status?: string | null;
}

interface RecentProjectsCardProps {
  projects: Project[] | undefined;
  isLoading: boolean;
  error: unknown;
  onCreateProject: () => void;
  /** Optional retry for the error state. */
  onRetry?: () => void;
}

export const RecentProjectsCard = memo(function RecentProjectsCard({ projects, isLoading, error, onCreateProject, onRetry }: RecentProjectsCardProps) {
  return (
    <WidgetCard
      title="Recent Projects"
      icon={Folder}
      actions={<ViewAllLink href="/projects" label="View All" ariaLabel="View all projects" />}
    >
      <div aria-live="polite">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`proj-skel-${i}`} className="h-11 w-full rounded-md" />
            ))}
          </div>
        ) : error ? (
          <WidgetError error={error} onRetry={onRetry} />
        ) : projects && projects.length > 0 ? (
          <ul className="-mx-2">
            {projects.slice(0, 6).map((project) => (
              <li key={project.id}>
                <WidgetListRow
                  href={`/projects/${project.id}`}
                  leading={<IconChip icon={Folder} size="sm" className="size-8" />}
                  title={project.name}
                  meta={<span className="font-mono">{project.key}</span>}
                  trailing={
                    project.status ? (
                      <StatusPill tone={projectStatusTone[project.status] ?? "neutral"} dot>
                        {project.status}
                      </StatusPill>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            title="No recent projects"
            description="Create your first project to start tracking work."
            action={{
              label: "Create Project",
              onClick: onCreateProject,
            }}
          />
        )}
      </div>
    </WidgetCard>
  );
});
