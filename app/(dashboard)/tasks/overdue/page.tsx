"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useOverdueTasks } from "@/lib/api/hooks/tasks";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

function overdueByDays(dueDate: string | null): number {
  if (!dueDate) return 0;
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OverdueTasksPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useOverdueTasks();
  const tasks = data?.tasks ?? [];

  const handleGoBack = useCallback(() => {
    if (typeof window === "undefined") {
      router.push("/dashboard");
      return;
    }
    const keyBefore = `${window.location.pathname}${window.location.search}`;
    router.back();
    window.setTimeout(() => {
      const keyAfter = `${window.location.pathname}${window.location.search}`;
      if (keyAfter === keyBefore) {
        router.push("/dashboard");
      }
    }, 200);
  }, [router]);

  return (
    <PageWrapper
      title="Overdue Tasks"
      subtitle="Pending tasks past their due date across the organization"
      actions={
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGoBack}
          className="shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No overdue tasks"
          description="Everything is on track."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-sticky bg-surface-sunken">
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Overdue By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const days = overdueByDays(task.dueDate);
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="max-w-xs truncate font-medium" title={task.title}>{task.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{task.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="size-6">
                                <AvatarImage src={task.assignee.image ?? undefined} />
                                <AvatarFallback className="text-2xs">
                                  {task.assignee.name?.charAt(0) ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.assignee.name ?? "Unknown"}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{formatDate(task.dueDate)}</TableCell>
                        <TableCell className="text-right">
                          <StatusPill tone="danger" dot className="tabular-nums">
                            {days} {days === 1 ? "day" : "days"}
                          </StatusPill>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
