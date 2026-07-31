"use client";

import React from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Progress } from "@/components/ui/progress";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
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
  const statusColor = getColorSafe(projectStatusColors, status);
  const dateStr = project.startDate
    ? format(new Date(project.startDate), "MMM d")
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={`${project.name} — ${displayLabel}`}
      className="block h-full"
    >
      <div
        className="rounded-lg border bg-card p-4 hover:shadow-md hover:border-border/80 transition-all cursor-pointer h-full min-h-[230px] flex flex-col group"
        role="listitem"
      >

        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {project.key}
          </span>
          <Badge
            variant="secondary"
            className={`text-[10px] font-medium ${statusColor}`}
          >
            {displayLabel}
          </Badge>
        </div>

        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
          {project.name}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem] mb-3">
          {project.description || "No description provided."}
        </p>

        <div className="flex-1" />

        <div className="mb-3 min-h-[1.7rem]">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Progress</span>
            <span className="tabular-nums">
              {project.progress.total > 0 ? `${project.progress.done}/${project.progress.total}` : "0/0"}
            </span>
          </div>
          <Progress value={project.progress.total > 0 ? project.progress.percentage : 0} className="h-1" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <AvatarStack
            users={project.members}
            limit={4}
            className="[&>div]:h-6 [&>div]:w-6"
          />
          {dateStr && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {dateStr}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});
