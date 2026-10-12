"use client";

import { ChevronsUp, ChevronUp, Equal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/lib/design/tones";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const config = {
  URGENT: { label: "Urgent", icon: ChevronsUp, tone: "danger" },
  HIGH: { label: "High", icon: ChevronUp, tone: "warning" },
  MEDIUM: { label: "Medium", icon: Equal, tone: "brand" },
  LOW: { label: "Low", icon: ChevronDown, tone: "neutral" },
} as const satisfies Record<string, { label: string; icon: unknown; tone: Tone }>;

interface PriorityBadgeProps {
  priority: string | null | undefined;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function PriorityBadge({
  priority,
  showLabel = false,
  size = "sm",
  className,
}: PriorityBadgeProps) {
  const key = (priority ?? "MEDIUM") as keyof typeof config;
  const c = config[key] ?? config.MEDIUM;
  const Icon = c.icon;
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  if (showLabel) {
    return (
      <StatusPill tone={c.tone} className={className}>
        <Icon aria-hidden="true" />
        {c.label}
      </StatusPill>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={`${c.label} Priority`}
            className={cn("inline-flex shrink-0", toneText[c.tone], className)}
          >
            <Icon className={iconSize} aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {c.label} Priority
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
