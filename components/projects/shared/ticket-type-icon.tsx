"use client";

import {
  CheckSquare,
  Bug,
  BookOpen,
  Layers,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toneSoft, type Tone } from "@/lib/design/tones";

const typeMap = {
  TASK: { icon: CheckSquare, tone: "info" },
  BUG: { icon: Bug, tone: "danger" },
  STORY: { icon: BookOpen, tone: "success" },
  EPIC: { icon: Layers, tone: "plum" },
  SUBTASK: { icon: GitBranch, tone: "neutral" },
} as const satisfies Record<string, { icon: unknown; tone: Tone }>;

const sizes = {
  sm: { chip: "size-5", icon: "size-4" },
  md: { chip: "size-6", icon: "size-4" },
  lg: { chip: "size-7", icon: "size-5" },
} as const;

interface TicketTypeIconProps {
  type: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Ticket type glyph in a rounded-sm tone chip (§6.2). */
export function TicketTypeIcon({
  type,
  size = "sm",
  className,
}: TicketTypeIconProps) {
  const key = type.toUpperCase() as keyof typeof typeMap;
  const config = typeMap[key] ?? typeMap.TASK;
  const Icon = config.icon;
  const s = sizes[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm p-0.5",
        toneSoft[config.tone],
        s.chip,
        className
      )}
    >
      <Icon className={s.icon} aria-hidden="true" />
    </span>
  );
}
