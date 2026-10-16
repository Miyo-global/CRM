"use client";

import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useInlineUpdateProject } from "@/lib/api/hooks/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ProjectListItem, ProjectPriority, ProjectStatusValue } from "@/types/projects";
import { ProjectRowActions } from "./project-row-actions";
import {
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  priorityLabel,
  statusLabel,
  type ProjectGroupBy,
} from "./project-options";

const NONE = "none";

function managerName(manager: ProjectListItem["manager"]) {
  if (!manager) return "Unassigned";
  return [manager.firstName, manager.lastName].filter(Boolean).join(" ") || "Unnamed";
}

function groupRows(projects: ProjectListItem[], groupBy: ProjectGroupBy) {
  if (groupBy === "none") return [{ label: null, rows: projects }];
  const groups = new Map<string, ProjectListItem[]>();
  for (const p of projects) {
    const label = groupBy === "status" ? statusLabel(p.status) : priorityLabel(p.priority);
    groups.set(label, [...(groups.get(label) ?? []), p]);
  }
  return [...groups.entries()].map(([label, rows]) => ({ label, rows }));
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  const update = useInlineUpdateProject();
  const onError = (error: Error) => toast.error(getErrorMessage(error));

  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-muted-foreground">{project.key}</TableCell>
      <TableCell className="max-w-72">
        <Link href={`/projects/${project.id}`} className="block truncate font-medium text-foreground hover:text-brand-text focus-visible:focus-ring rounded-sm">
          {project.name}
        </Link>
      </TableCell>
      <TableCell>
        <Select
          value={project.status ?? "ACTIVE"}
          onValueChange={(status) =>
            update.mutate({ projectId: project.id, status: status as ProjectStatusValue }, { onError })
          }
        >
          <SelectTrigger className="h-10 w-36" aria-label={`Status of ${project.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={project.priority ?? NONE}
          onValueChange={(value) =>
            update.mutate(
              { projectId: project.id, priority: value === NONE ? null : (value as ProjectPriority) },
              { onError },
            )
          }
        >
          <SelectTrigger className="h-10 w-full min-w-36" aria-label={`Priority of ${project.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No priority</SelectItem>
            {PROJECT_PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="w-40">
        <div className="flex items-center gap-2">
          <Progress value={project.progress.percentage} className="h-1.5 flex-1" />
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{project.progress.percentage}%</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{managerName(project.manager)}</TableCell>
      <TableCell className="text-xs tabular-nums text-muted-foreground">
        {project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "No due date"}
      </TableCell>
      <TableCell className="w-12 text-right">
        <ProjectRowActions project={project} />
      </TableCell>
    </TableRow>
  );
}

export function ProjectTable({ projects, groupBy }: { projects: ProjectListItem[]; groupBy: ProjectGroupBy }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Key</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupRows(projects, groupBy).flatMap((group) => [
            ...(group.label
              ? [
                  <TableRow key={`group-${group.label}`} className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={8} className="py-2 text-xs font-medium text-muted-foreground">
                      {group.label} · {group.rows.length}
                    </TableCell>
                  </TableRow>,
                ]
              : []),
            ...group.rows.map((project) => <ProjectRow key={project.id} project={project} />),
          ])}
        </TableBody>
      </Table>
    </div>
  );
}
