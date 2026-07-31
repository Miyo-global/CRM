"use client";

import React from "react";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Progress } from "@/components/ui/progress";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
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
  const statusColor = getColorSafe(projectStatusColors, status);
  const dateStr = project.startDate
    ? format(new Date(project.startDate), "MMM d")
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={`${project.name} — ${displayLabel}`}
    >
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:shadow-sm hover:bg-muted/30 transition-all group"
        role="listitem"
      >

        <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 w-14 text-center">
          {project.key}
        </span>

        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate flex-1 min-w-0">
          {project.name}
        </p>

        {project.progress.total > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0 w-28">
            <Progress value={project.progress.percentage} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
              {Math.round(project.progress.percentage)}%
            </span>
          </div>
        )}

        <Badge
          variant="secondary"
          className={`text-[10px] font-medium shrink-0 hidden md:inline-flex ${statusColor}`}
        >
          {displayLabel}
        </Badge>

        <div className="hidden lg:block shrink-0">
          <AvatarStack
            users={project.members}
            limit={3}
            className="[&>div]:h-6 [&>div]:w-6"
          />
        </div>

        {dateStr && (
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Calendar className="h-3 w-3" />
            {dateStr}
          </div>
        )}

        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      </div>
    </Link>
  );
});
