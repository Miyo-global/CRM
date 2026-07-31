"use client";

import { BarChart3 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalyticsChartCard } from "./analytics-chart-card";

interface RepPerformanceTableProps {
  leaderboard: Array<{
    userId: string;
    name: string;
    leadsAssigned: number;
    leadsConverted: number;
    totalCalls: number;
    score: number;
  }> | undefined;
}

export function RepPerformanceTable({ leaderboard }: RepPerformanceTableProps) {
  const data = (leaderboard ?? []).map((l) => ({
    name: l.name, score: l.score, converted: l.leadsConverted, calls: l.totalCalls,
  }));

  const isEmpty = !leaderboard || leaderboard.length === 0;

  return (
    <AnalyticsChartCard title="Rep Performance" data={data} filename="rep-performance">
      {isEmpty ? (
        <EmptyState
          compact
          icon={BarChart3}
          title="No rep activity yet"
          description="Performance ranks here once reps are assigned leads and start logging calls and conversions."
          className="border-0 bg-transparent"
        />
      ) : (
        <div className="max-h-[280px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Rep</TableHead>
                <TableHead className="text-xs text-right">Leads</TableHead>
                <TableHead className="text-xs text-right">Converted</TableHead>
                <TableHead className="text-xs text-right">Calls</TableHead>
                <TableHead className="text-xs text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((rep, i) => (
                <TableRow key={rep.userId}>
                  <TableCell className="text-xs font-medium">
                    <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                    {rep.name}
                  </TableCell>
                  <TableCell className="text-xs text-right">{rep.leadsAssigned}</TableCell>
                  <TableCell className="text-xs text-right text-success">{rep.leadsConverted}</TableCell>
                  <TableCell className="text-xs text-right">{rep.totalCalls}</TableCell>
                  <TableCell className="text-xs text-right font-semibold">{rep.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AnalyticsChartCard>
  );
}
