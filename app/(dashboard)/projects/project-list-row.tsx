"use client";

import React from "react";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Progress } from "@/components/ui/progress";
import { projectStatusDisplayLabels } from "@/lib/theme-constants";
import { projectStatusTone } from "./project-status-tone";
import { format } from "date-fns";

interface ProjectListRowProps {
  project: {
    id: number;
    name: string;
    key: string;
    status: string | null;
    startDate: Date | string | null;
    progress: { total: number; done: number; percentage: number };
    members: { id: string; firstName: string | null; lastName: string | null; image: string | null }[];
  };
}

export const ProjectListRow = React.memo(function ProjectListRow({
  project,
}: ProjectListRowProps) {
  const status = project.status ?? "ACTIVE";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusTone = projectStatusTone[status] ?? "neutral";
  const dateStr = project.startDate
    ? format(new Date(project.startDate), "MMM d")
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={`${project.name} — ${displayLabel}`}
      className="group block rounded-lg outline-none focus-visible:focus-ring"
    >
      <Card
        interactive
        className="flex-row items-center gap-3 px-4 py-3"
        role="listitem"
      >
        <span className="w-14 shrink-0 rounded-xs bg-muted px-1.5 py-0.5 text-center font-mono text-2xs text-muted-foreground">
          {project.key}
        </span>

        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand-text">
          {project.name}
        </p>

        {project.progress.total > 0 && (
          <div className="hidden w-32 shrink-0 items-center gap-2 sm:flex">
            <Progress value={project.progress.percentage} className="h-1.5 flex-1" />
            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(project.progress.percentage)}%
            </span>
          </div>
        )}

        <StatusPill tone={statusTone} dot className="hidden shrink-0 md:inline-flex">
          {displayLabel}
        </StatusPill>

        <div className="hidden shrink-0 lg:block">
          <AvatarStack
            users={project.members}
            limit={3}
            className="[&>div]:size-6"
          />
        </div>

        {dateStr && (
          <div className="hidden shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground lg:flex">
            <Calendar className="size-3.5" aria-hidden="true" />
            {dateStr}
          </div>
        )}

        <ChevronRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
      </Card>
    </Link>
  );
});
