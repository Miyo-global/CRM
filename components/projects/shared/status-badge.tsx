"use client";

import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; dotColor: string }> = {
  TODO: { label: "To Do", dotColor: "bg-muted-foreground" },
  IN_PROGRESS: { label: "In Progress", dotColor: "bg-blue-500" },
  IN_REVIEW: { label: "In Review", dotColor: "bg-amber-500" },
  DONE: { label: "Done", dotColor: "bg-green-500" },
  CANCELLED: { label: "Cancelled", dotColor: "bg-red-400" },
};

interface StatusBadgeProps {
  status: string;
  customStates?: { name: string; color: string; group: string }[];
  className?: string;
}

export function StatusBadge({
  status,
  customStates,
  className,
}: StatusBadgeProps) {

  const custom = customStates?.find(
    (s) => s.name === status || s.name.toUpperCase().replace(/\s+/g, "_") === status
  );

  if (custom) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: custom.color }}
        />
        <span className="truncate">{custom.name}</span>
      </span>
    );
  }

  const mapped = statusMap[status] ?? {
    label: status.replace(/_/g, " "),
    dotColor: "bg-muted-foreground",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", mapped.dotColor)} />
      <span className="truncate">{mapped.label}</span>
    </span>
  );
}
