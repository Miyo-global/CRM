"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatHoursMinutes } from "@/lib/format-utils";

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  REJECTED: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "Pending",
  REJECTED: "Rejected",
};

const PROJECT_DOT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
] as const;

function getProjectDotColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_DOT_COLORS[Math.abs(hash) % PROJECT_DOT_COLORS.length];
}

export interface EditEntry {
  id: number;
  description: string | null;
  hours: string;
  status: string;
}

export interface TimeEntry {
  id: number;
  date: string;
  hours: string | number | null;
  description: string | null;
  status: string | null;
  ticket?: { project?: { name?: string | null } | null } | null;
}

interface TimesheetTableRowProps {
  entry: TimeEntry;
  onEdit: (entry: EditEntry) => void;
  onDelete: (id: number) => void;
}

export function TimesheetTableRow({ entry, onEdit, onDelete }: TimesheetTableRowProps) {
  const canEdit = entry.status === "PENDING";
  const projectName = entry.ticket?.project?.name || "Unknown";
  const dotColor = getProjectDotColor(projectName);
  const statusKey = entry.status || "PENDING";

  const handleEdit = useCallback(() => {
    onEdit({
      id: entry.id,
      description: entry.description,
      hours: entry.hours?.toString() || "0",
      status: entry.status || "PENDING",
    });
  }, [entry, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(entry.id);
  }, [entry.id, onDelete]);

  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="px-6 py-5 whitespace-nowrap">
        <span className="text-sm font-semibold">
          {format(new Date(entry.date), "MMM dd, yyyy")}
        </span>
      </TableCell>
      <TableCell className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full shrink-0 ${dotColor}`} />
          <span className="text-sm font-medium">{projectName}</span>
        </div>
      </TableCell>
      <TableCell className="px-6 py-5 max-w-xs">
        <p className="text-sm text-muted-foreground truncate">
          {entry.description || "No description"}
        </p>
      </TableCell>
      <TableCell className="px-6 py-5 whitespace-nowrap">
        <span className="text-sm font-medium">
          {formatHoursMinutes(entry.hours)}
        </span>
      </TableCell>
      <TableCell className="px-6 py-5 whitespace-nowrap">
        <Badge className={`text-xs font-bold border-0 rounded-full px-2.5 py-0.5 ${STATUS_BADGE_STYLES[statusKey]}`}>
          {STATUS_LABELS[statusKey] || statusKey}
        </Badge>
      </TableCell>
      <TableCell className="px-6 py-5 text-right">
        {canEdit && (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Edit entry"
              onClick={handleEdit}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label="Delete entry"
              onClick={handleDelete}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
