"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useExecutiveDashboard } from "@/lib/api/hooks/dashboard";
import { FolderKanban, ExternalLink } from "lucide-react";
import Link from "next/link";

export function ProjectHealthWidget() {
  const { data, isLoading, error } = useExecutiveDashboard();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">Project Health</CardTitle>
        </div>
        <Link
          href="/projects"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          aria-label="View all projects"
        >
          View all
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-primary/5 p-4 text-center">
              <p className="text-2xl font-bold tabular-nums text-primary">
                {data?.activeProjects ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Active Projects</p>
            </div>
            <div className="rounded-xl border bg-muted/40 p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {data?.newLeadsThisWeek ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">New Leads (7d)</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
