"use client";

import React from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Progress } from "@/components/ui/progress";
import { projectStatusDisplayLabels } from "@/lib/theme-constants";
import { projectStatusTone } from "./project-status-tone";
import { format } from "date-fns";

interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    key: string;
    status: string | null;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    manager: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      image: string | null;
    } | null;
    progress: { total: number; done: number; percentage: number };
    members: { id: string; firstName: string | null; lastName: string | null; image: string | null }[];
  };
}

export const ProjectCard = React.memo(function ProjectCard({ project }: ProjectCardProps) {
  const status = project.status ?? "ACTIVE";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusTone = projectStatusTone[status] ?? "neutral";
  // An unlabelled date read as the due date when it was the start date
  // (QA-0055). Show the due date when there is one, and name it either way.
  const dateLabel = project.endDate
    ? `Due ${format(new Date(project.endDate), "MMM d")}`
    : project.startDate
      ? `Starts ${format(new Date(project.startDate), "MMM d")}`
      : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={`${project.name} — ${displayLabel}`}
      className="group block h-full rounded-lg outline-none focus-visible:focus-ring"
    >
      <Card interactive className="h-full min-h-56 gap-0 p-5" role="listitem">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
            {project.key}
          </span>
          <StatusPill tone={statusTone} dot>
            {displayLabel}
          </StatusPill>
        </div>

        <h3 className="mb-1 line-clamp-1 text-lg font-semibold text-foreground transition-colors group-hover:text-brand-text">
          {project.name}
        </h3>

        <p className="mb-4 line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {project.description || "No description provided."}
        </p>

        <div className="flex-1" />

        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">
              {project.progress.total > 0 ? `${project.progress.done}/${project.progress.total}` : "0/0"}
            </span>
          </div>
          <Progress value={project.progress.total > 0 ? project.progress.percentage : 0} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <AvatarStack
            users={project.members}
            limit={4}
            className="[&>div]:size-6"
          />
          {dateLabel && (
            <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
              <Calendar className="size-3.5" aria-hidden="true" />
              {dateLabel}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
});
