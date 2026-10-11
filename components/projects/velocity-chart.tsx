"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";

interface Sprint {
  id: number;
  name: string;
  status: string | null;
  tickets?: Array<{
    id: number;
    status: string | null;
    points: number | null;
  }>;
}

interface VelocityChartProps {
  sprints: Sprint[];
}

export function VelocityChart({ sprints }: VelocityChartProps) {
  const completedSprints = sprints
    .filter(s => s.status === "COMPLETED")
    .slice(0, 8)
    .reverse();

  if (completedSprints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconChip icon={TrendingUp} size="sm" />
            <CardTitle className="text-base">Velocity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Complete sprints to see velocity data
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = completedSprints.map(sprint => {
    const tickets = sprint.tickets || [];
    const committed = tickets.reduce((sum, t) => sum + (t.points || 0), 0);
    const completed = tickets
      .filter(t => t.status === "DONE")
      .reduce((sum, t) => sum + (t.points || 0), 0);
    return { name: sprint.name, committed, completed };
  });

  const maxPoints = Math.max(...data.map(d => Math.max(d.committed, d.completed)), 1);
  const avgVelocity = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.completed, 0) / data.length)
    : 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <IconChip icon={TrendingUp} size="sm" />
          <CardTitle className="text-base">Velocity</CardTitle>
          <span className="ml-auto text-sm text-muted-foreground">
            Avg: <span className="font-semibold tabular-nums text-foreground">{avgVelocity} pts</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-chart-2" />
            Committed
          </span>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-chart-1" />
            Completed
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 h-40" role="img" aria-label="Sprint velocity: committed vs completed points">
          {data.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex h-30 w-full max-w-16 items-end gap-0.5">
                <div
                  className="flex-1 rounded-t-sm bg-chart-2 transition-[height] motion-reduce:transition-none"
                  style={{ height: `${(item.committed / maxPoints) * 100}%` }}
                  title={`Committed: ${item.committed} pts`}
                />
                <div
                  className="flex-1 rounded-t-sm bg-chart-1 transition-[height] motion-reduce:transition-none"
                  style={{ height: `${(item.completed / maxPoints) * 100}%` }}
                  title={`Completed: ${item.completed} pts`}
                />
              </div>
              <span className="text-2xs text-muted-foreground truncate max-w-full text-center">
                {item.name.length > 8 ? item.name.slice(0, 8) + "…" : item.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
