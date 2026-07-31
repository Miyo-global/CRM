"use client";

import { memo } from "react";
import { Clock, Users, FolderOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TeamSummaryProps {
  totalHours: number;
  uniqueEmployees: number;
  uniqueProjects: number;
  avgHoursPerDay: number;
  entryCount: number;
}

export const TeamSummary = memo(function TeamSummary({
  totalHours,
  uniqueEmployees,
  uniqueProjects,
  avgHoursPerDay,
  entryCount,
}: TeamSummaryProps) {
  const cards = [
    {
      title: "Total Hours",
      value: `${totalHours.toFixed(1)}h`,
      sub: `Across ${entryCount} entries`,
      icon: Clock,
    },
    {
      title: "Employees",
      value: String(uniqueEmployees),
      sub: "Team members logged time",
      icon: Users,
    },
    {
      title: "Projects",
      value: String(uniqueProjects),
      sub: "Active projects worked on",
      icon: FolderOpen,
    },
    {
      title: "Avg Hours/Day",
      value: `${avgHoursPerDay.toFixed(1)}h`,
      sub: "Average per working day",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="transition-colors hover:border-gold/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{card.value}</div>
              </div>
              <div className="shrink-0 rounded-lg bg-muted/60 p-2">
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
