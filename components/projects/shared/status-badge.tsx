"use client";

import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";

const statusMap: Record<string, { label: string; tone: Tone }> = {
  TODO: { label: "To Do", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "info" },
  IN_REVIEW: { label: "In Review", tone: "warning" },
  DONE: { label: "Done", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
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
    // Custom workflow states carry their own colour from data.
    return (
      <StatusPill tone="neutral" className={cn("max-w-full", className)}>
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: custom.color }}
        />
        <span className="truncate">{custom.name}</span>
      </StatusPill>
    );
  }

  const mapped = statusMap[status] ?? {
    label: status.replace(/_/g, " "),
    tone: "neutral" as const,
  };

  return (
    <StatusPill tone={mapped.tone} dot className={cn("max-w-full", className)}>
      <span className="truncate">{mapped.label}</span>
    </StatusPill>
  );
}
