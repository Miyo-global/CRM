"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSprintBurndown } from "@/lib/api/hooks/projects";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { parseCalendarDate } from "@/lib/date-utils";

interface BurndownChartProps {
  sprintId: number;
  projectId: number;
}

export function BurndownChart({ sprintId, projectId }: BurndownChartProps) {
  const { data, isLoading } = useSprintBurndown(projectId, sprintId);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; points: number } | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading burndown chart...</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">No data available</CardContent>
      </Card>
    );
  }

  const { idealBurndown, actualBurndown, totalPoints } = data;
  const maxPoints = Math.max(
    ...idealBurndown.map((d) => d.points),
    totalPoints,
    1
  );
  const chartHeight = 280;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 30;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const yTicks = [...new Set([0, Math.round(maxPoints / 4), Math.round(maxPoints / 2), Math.round(3 * maxPoints / 4), maxPoints])];

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Burndown Chart</CardTitle>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{totalPoints} total points</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-muted-foreground">
            <svg width="14" height="2" aria-hidden="true">
              <line x1="0" y1="1" x2="14" y2="1" stroke="var(--chart-axis)" strokeWidth="2" strokeDasharray="3 2" />
            </svg>
            Ideal ({totalPoints} pts)
          </span>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-chart-1" />
            Actual
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height: `${chartHeight}px` }}>
          <svg width="100%" height={chartHeight} className="overflow-visible" role="img" aria-label={`Burndown chart, ${totalPoints} total points`}>
            {yTicks.map((tick) => {
              const y = paddingTop + ((maxPoints - tick) / maxPoints) * plotHeight;
              return (
                <g key={tick}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="var(--chart-grid)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="var(--chart-axis)"
                    fontSize="11"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {idealBurndown.map((point, index) => {
              const len = idealBurndown.length - 1;
              if (index >= len) return null;
              const x1 = paddingLeft + (index / len) * (100 - paddingLeft - paddingRight) + "%";
              const y1 = paddingTop + ((maxPoints - point.points) / maxPoints) * plotHeight;
              const nextPoint = idealBurndown[index + 1];
              const x2 = paddingLeft + ((index + 1) / len) * (100 - paddingLeft - paddingRight) + "%";
              const y2 = paddingTop + ((maxPoints - nextPoint.points) / maxPoints) * plotHeight;

              return (
                <motion.line
                  key={`ideal-${index}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="var(--chart-axis)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.01 }}
                />
              );
            })}

            {actualBurndown.length > 0 && actualBurndown.map((point, index) => {
              const dateIndex = idealBurndown.findIndex(
                (d) => format(d.date, "yyyy-MM-dd") === format(parseCalendarDate(point.date), "yyyy-MM-dd")
              );
              if (dateIndex === -1) return null;

              const len = idealBurndown.length - 1;
              const nextPoint = actualBurndown[index + 1];
              const nextDateIndex = nextPoint
                ? idealBurndown.findIndex(
                    (d) => format(d.date, "yyyy-MM-dd") === format(parseCalendarDate(nextPoint.date), "yyyy-MM-dd")
                  )
                : -1;

              const xPct = (dateIndex / len) * (100 - paddingLeft - paddingRight);
              const y = paddingTop + ((maxPoints - Number(point.points)) / maxPoints) * plotHeight;

              return (
                <g key={`actual-g-${index}`}>
                  {nextDateIndex !== -1 && nextPoint && (
                    <motion.line
                      x1={`${paddingLeft + xPct}%`}
                      y1={y}
                      x2={`${paddingLeft + (nextDateIndex / len) * (100 - paddingLeft - paddingRight)}%`}
                      y2={paddingTop + ((maxPoints - Number(nextPoint.points)) / maxPoints) * plotHeight}
                      stroke="var(--chart-1)"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.01 }}
                    />
                  )}
                  <motion.circle
                    cx={`${paddingLeft + xPct}%`}
                    cy={y}
                    r="4"
                    fill="var(--chart-1)"
                    stroke="var(--card)"
                    strokeWidth="2"
                    className="cursor-pointer"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onMouseEnter={(e) => {
                      const rect = (e.target as SVGElement).getBoundingClientRect();
                      setHoveredPoint({
                        x: rect.left,
                        y: rect.top,
                        date: format(parseCalendarDate(point.date), "MMM dd"),
                        points: Number(point.points),
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}
          </svg>

          {hoveredPoint && (
            <div
              className="pointer-events-none fixed z-popover rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md"
              style={{ left: hoveredPoint.x + 10, top: hoveredPoint.y - 40 }}
            >
              <div className="font-medium tabular-nums">{hoveredPoint.date}</div>
              <div className="tabular-nums text-muted-foreground">{hoveredPoint.points} pts remaining</div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-2xs tabular-nums text-muted-foreground" style={{ paddingLeft: `${paddingLeft}px`, paddingRight: `${paddingRight}px` }}>
            {idealBurndown.map((point, index) => {
              if (index % Math.ceil(idealBurndown.length / 6) !== 0 && index !== idealBurndown.length - 1) return null;
              return <span key={index}>{format(point.date, "MMM dd")}</span>;
            })}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
