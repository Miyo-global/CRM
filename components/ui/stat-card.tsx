"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import type { Tone } from "@/lib/design/tones";

interface StatCardProps {
  label: string;
  value: string | number;
  valueTooltip?: React.ReactNode;
  /**
   * Kept for call sites, but a stat tile renders text only: no icon chip and
   * no coloured number (B7).
   */
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  href?: string;
  className?: string;
  index?: number;

  /** Legacy colour props, accepted and ignored: tiles are ink on white (B7). */
  color?: "gold" | "blue" | "green" | "red" | "purple";
  tone?: Tone;
  /** Optional mini trend line (32px tall) under the value. */
  sparkline?: number[];
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const range = Math.max(...data) - min || 1;
  const step = 100 / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(2)},${(30 - ((v - min) / range) * 28).toFixed(2)}`);
  const line = `M${points.join(" L")}`;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" className="mt-3 h-8 w-full text-chart-1">
      <path d={`${line} L100,32 L0,32 Z`} fill="currentColor" fillOpacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  valueTooltip,
  trend,
  href,
  className,
  index = 0,
  sparkline,
}: StatCardProps) {

  const valueNode = (
    <p title={String(value)} className={cn(
      "mt-2 truncate font-display font-extrabold leading-none tabular-nums text-foreground",
      typeof value === "string" && value.length > 8 ? "text-2xl" : "text-3xl",
      valueTooltip && "cursor-help"
    )}>
      {value}
    </p>
  );

  const content = (
    <div
      className={cn(
        "group relative h-full animate-fade-up rounded-lg border border-border bg-card p-5 shadow-xs transition-[border-color,box-shadow] duration-150",
        href && "cursor-pointer hover:border-border-strong hover:shadow-md",
        className
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
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
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-2xs font-medium tabular-nums text-muted-foreground">
                {trend.isPositive ? (
                  <TrendingUp className="size-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="size-3" aria-hidden="true" />
                )}
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-2xs text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>

      </div>
      {sparkline && <Sparkline data={sparkline} />}
    </div>
  );

  if (href) return <Link href={href} className="block rounded-lg focus-visible:focus-ring">{content}</Link>;
  return content;
}
