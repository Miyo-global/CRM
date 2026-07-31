"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSprintBurndown } from "@/lib/api/hooks/projects";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { TrendingDown } from "lucide-react";

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
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Burndown Chart
          <span className="text-sm font-normal text-muted-foreground ml-auto">{totalPoints} total points</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height: `${chartHeight}px` }}>
          <svg width="100%" height={chartHeight} className="overflow-visible">
            <defs>
              <linearGradient id="idealGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="actualGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => {
              const y = paddingTop + ((maxPoints - tick) / maxPoints) * plotHeight;
              return (
                <g key={tick}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground"
                    fontSize="10"
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
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.01 }}
                />
              );
            })}

            {actualBurndown.length > 0 && actualBurndown.map((point, index) => {
              const dateIndex = idealBurndown.findIndex(
                (d) => format(d.date, "yyyy-MM-dd") === format(new Date(point.date), "yyyy-MM-dd")
              );
              if (dateIndex === -1) return null;

              const len = idealBurndown.length - 1;
              const nextPoint = actualBurndown[index + 1];
              const nextDateIndex = nextPoint
                ? idealBurndown.findIndex(
                    (d) => format(d.date, "yyyy-MM-dd") === format(new Date(nextPoint.date), "yyyy-MM-dd")
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
                      stroke="#10B981"
                      strokeWidth="2.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.01 }}
                    />
                  )}
                  <motion.circle
                    cx={`${paddingLeft + xPct}%`}
                    cy={y}
                    r="4"
                    fill="#10B981"
                    stroke="white"
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
                        date: format(new Date(point.date), "MMM dd"),
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
              className="fixed z-50 bg-popover border shadow-md rounded-md px-3 py-2 text-xs pointer-events-none"
              style={{ left: hoveredPoint.x + 10, top: hoveredPoint.y - 40 }}
            >
              <div className="font-medium">{hoveredPoint.date}</div>
              <div className="text-muted-foreground">{hoveredPoint.points} pts remaining</div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground" style={{ paddingLeft: `${paddingLeft}px`, paddingRight: `${paddingRight}px` }}>
            {idealBurndown.map((point, index) => {
              if (index % Math.ceil(idealBurndown.length / 6) !== 0 && index !== idealBurndown.length - 1) return null;
              return <span key={index}>{format(point.date, "MMM dd")}</span>;
            })}
          </div>
        </div>

        <div className="mt-4 flex gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500 border-dashed border-t-2 border-blue-500" />
            <span className="text-xs text-muted-foreground">Ideal ({totalPoints} pts)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-xs text-muted-foreground">Actual</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
