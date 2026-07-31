"use client";

import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const config = {
  URGENT: {
    label: "Urgent",
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  HIGH: {
    label: "High",
    icon: ArrowUp,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  MEDIUM: {
    label: "Medium",
    icon: Minus,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  LOW: {
    label: "Low",
    icon: ArrowDown,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
} as const;

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
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (showLabel) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
          c.bg,
          c.color,
          className
        )}
      >
        <Icon className={iconSize} />
        {c.label}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex", c.color, className)}>
            <Icon className={iconSize} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {c.label} Priority
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
