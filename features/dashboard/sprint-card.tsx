"use client";

import { memo } from "react";
import Link from "next/link";
import { Zap, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySprintIllustration } from "@/components/illustrations";
import { sprintStatusColors } from "@/lib/theme-constants";

const SPRINT_DANGER_DAYS = 2;

interface SprintSummary {
  projectId?: number;
  name: string;
  projectName: string;
  progress: number;
  daysRemaining: number;
  completedPoints: number;
  totalPoints: number;
  doneTickets: number;
  inProgressTickets: number;
  todoTickets: number;
}

interface SprintCardProps {
  summary: SprintSummary | undefined;
  isLoading: boolean;
}

export const SprintCard = memo(function SprintCard({ summary, isLoading }: SprintCardProps) {
  return (
    <Card className="bg-card border-border shadow-noir flex flex-col h-full w-full">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between px-4 py-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-gold" aria-hidden="true" />
          Active Sprint
        </CardTitle>
        {summary?.projectId && (
          <Link href={`/projects/${summary.projectId}`}>
            <Button variant="ghost" size="sm" className="hover:bg-gold/10 hover:text-gold" aria-label="View sprint project">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden px-4 pt-0 pb-4" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : summary ? (
          <ScrollArea className="h-full pr-3">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">{summary.name}</h3>
              <p className="text-sm text-muted-foreground">{summary.projectName}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-gold">{summary.progress}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={summary.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Sprint progress" aria-valuetext={`${summary.progress}% complete — ${summary.completedPoints} of ${summary.totalPoints} points`}>
                <div
                  className="h-full rounded-full transition-all gold-gradient"
                  style={{ width: `${Math.min(100, Math.max(0, summary.progress))}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-2.5 rounded-lg border ${summary.daysRemaining <= SPRINT_DANGER_DAYS ? "bg-red-500/10 border-red-500/30" : "bg-muted/50 border-border"}`}>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Days Left
                  {summary.daysRemaining <= SPRINT_DANGER_DAYS && (
                    <AlertTriangle className="h-3 w-3 text-red-500" aria-hidden="true" />
                  )}
                </p>
                <p className={`text-lg font-bold ${summary.daysRemaining <= SPRINT_DANGER_DAYS ? "text-red-500" : "text-foreground"}`}>
                  {summary.daysRemaining}
                  {summary.daysRemaining <= SPRINT_DANGER_DAYS && (
                    <span className="text-xs font-medium ml-1">Urgent</span>
                  )}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Points</p>
                <p className="text-lg font-bold text-foreground">
                  {summary.completedPoints}/{summary.totalPoints}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${sprintStatusColors.done}`} aria-hidden="true" />
                  Done
                </span>
                <span className="font-medium">{summary.doneTickets}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${sprintStatusColors.inProgress}`} aria-hidden="true" />
                  In Progress
                </span>
                <span className="font-medium">{summary.inProgressTickets}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${sprintStatusColors.todo}`} aria-hidden="true" />
                  To Do
                </span>
                <span className="font-medium">{summary.todoTickets}</span>
              </div>
            </div>
          </div>
          </ScrollArea>
        ) : (
          <EmptyState
            illustration={<EmptySprintIllustration />}
            title="No active sprint"
            description="Start a sprint in your project to see progress here."
          />
        )}
      </CardContent>
    </Card>
  );
});
