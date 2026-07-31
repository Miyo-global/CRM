"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface StatCardProps {
  label: string;
  value: string | number;
  valueTooltip?: React.ReactNode;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  href?: string;
  className?: string;
  index?: number;

  color?: "gold" | "blue" | "green" | "red" | "purple";
}

const colorMap = {
  gold:   { bg: "bg-gold/10",   icon: "text-gold",          bar: "bg-gold" },
  blue:   { bg: "bg-blue/10",   icon: "text-blue",          bar: "bg-blue" },
  green:  { bg: "bg-success/10", icon: "text-success",      bar: "bg-success" },
  red:    { bg: "bg-destructive/10", icon: "text-destructive", bar: "bg-destructive" },
  purple: { bg: "bg-violet-500/10", icon: "text-violet-600", bar: "bg-violet-500" },
};

export function StatCard({
  label,
  value,
  valueTooltip,
  icon: Icon,
  trend,
  href,
  className,
  index = 0,
  color = "gold",
}: StatCardProps) {
  const c = colorMap[color];

  const valueNode = (
    <p className={cn(
      "font-semibold text-foreground mt-1 truncate leading-none",
      typeof value === "string" && value.length > 8 ? "text-xl" : "text-2xl",
      valueTooltip && "cursor-help"
    )}>
      {value}
    </p>
  );

  const content = (
    <div
      className={cn(
        "relative group rounded-xl border border-border bg-card p-4 overflow-hidden transition-all duration-200",
        href && "hover:border-gold/30 hover:shadow-soft cursor-pointer",
        className
      )}
      style={{ animation: `fade-up 0.3s ease-out ${index * 0.07}s both` }}
    >

      <div className={cn("absolute top-0 left-0 right-0 h-[2px]", c.bar, "opacity-60")} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          {valueTooltip ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>{valueNode}</TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {valueTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            valueNode
          )}

          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={cn(
                  "text-2xs font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-2xs text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        <div className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200",
          c.bg,
          href && "group-hover:scale-110"
        )}>
          <Icon className={cn("h-4 w-4", c.icon)} />
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
