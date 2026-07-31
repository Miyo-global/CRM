"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

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
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Velocity
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Avg: <span className="font-semibold text-foreground">{avgVelocity} pts</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 h-40">
          {data.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end" style={{ height: '120px' }}>
                <div
                  className="flex-1 bg-blue-200 dark:bg-blue-900/50 rounded-t transition-all"
                  style={{ height: `${(item.committed / maxPoints) * 100}%` }}
                  title={`Committed: ${item.committed} pts`}
                />
                <div
                  className="flex-1 bg-green-500 rounded-t transition-all"
                  style={{ height: `${(item.completed / maxPoints) * 100}%` }}
                  title={`Completed: ${item.completed} pts`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-full text-center">
                {item.name.length > 8 ? item.name.slice(0, 8) + "…" : item.name}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-200 dark:bg-blue-900/50 rounded" />
            <span className="text-xs text-muted-foreground">Committed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
