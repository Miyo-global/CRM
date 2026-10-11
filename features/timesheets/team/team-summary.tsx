"use client";

import { memo } from "react";
import { Clock, Users, FolderOpen, TrendingUp } from "lucide-react";
import { StatsStrip } from "@/components/shared/stats-strip";

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
  return (
    <StatsStrip
      items={[
        { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, hint: `Across ${entryCount} entries`, icon: Clock },
        { label: "Employees", value: String(uniqueEmployees), hint: "Team members logged time", icon: Users },
        { label: "Projects", value: String(uniqueProjects), hint: "Active projects worked on", icon: FolderOpen },
        { label: "Avg Hours/Day", value: `${avgHoursPerDay.toFixed(1)}h`, hint: "Average per working day", icon: TrendingUp },
      ]}
    />
  );
});
