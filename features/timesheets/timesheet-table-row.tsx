"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatHoursMinutes } from "@/lib/format-utils";
import { toneDot, toneForKey, type Tone } from "@/lib/design/tones";
import { parseCalendarDate } from "@/lib/date-utils";

const STATUS_TONES: Record<string, Tone> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "Pending",
  REJECTED: "Rejected",
};

function getProjectDotColor(name: string): string {
  return toneDot[toneForKey(name)];
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
    <TableRow>
      <TableCell className="whitespace-nowrap px-4 sm:px-6">
        <span className="text-sm font-medium tabular-nums">
          {format(parseCalendarDate(entry.date), "MMM dd, yyyy")}
        </span>
      </TableCell>
      <TableCell className="px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dotColor}`} />
          <span className="text-sm font-medium">{projectName}</span>
        </div>
      </TableCell>
      <TableCell className="max-w-xs px-4 sm:px-6">
        <p className="truncate text-sm text-muted-foreground" title={entry.description || undefined}>
          {entry.description || "No description"}
        </p>
      </TableCell>
      <TableCell className="whitespace-nowrap px-4 sm:px-6">
        <span className="text-sm font-medium tabular-nums">
          {formatHoursMinutes(entry.hours)}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap px-4 sm:px-6">
        <StatusPill tone={STATUS_TONES[statusKey] ?? "neutral"} dot>
          {STATUS_LABELS[statusKey] || statusKey}
        </StatusPill>
      </TableCell>
      <TableCell className="px-4 text-right sm:px-6">
        {canEdit && (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Edit entry"
              onClick={handleEdit}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete entry"
              onClick={handleDelete}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
