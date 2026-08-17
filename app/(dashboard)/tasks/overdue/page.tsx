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
import { ArrowLeft } from "lucide-react";
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
  const { data, isLoading } = useOverdueTasks();
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
          className="h-9 w-9 shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-green-600"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div>
              <p className="font-medium">No overdue tasks</p>
              <p className="text-sm text-muted-foreground">Everything is on track.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
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
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{task.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={task.assignee.image ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {task.assignee.name?.charAt(0) ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.assignee.name ?? "Unknown"}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(task.dueDate)}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-amber-600">
                            {days} {days === 1 ? "day" : "days"}
                          </span>
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
