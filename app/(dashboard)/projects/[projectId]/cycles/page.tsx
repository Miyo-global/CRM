"use client";

import { use, useState, useCallback } from "react";
import { useCycles, useCreateCycle } from "@/lib/api/hooks/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { formatCalendarDate } from "@/lib/date-utils";
import { periodStatus } from "@/lib/projects/period-status";

const createCycleSchema = z.object({
  name: z.string().min(1, "Name is required").regex(/^[A-Za-z]/, "Name must start with a letter").max(100),
  description: z.string().optional(),
  startDate: z.string().min(1, "Pick a start date").refine(
    (v) => { const y = Number(v.slice(0, 4)); return y >= 2000 && y <= 2099; },
    "Pick a date between 2000 and 2099"
  ),
  endDate: z.string().min(1, "Pick an end date").refine(
    (v) => { const y = Number(v.slice(0, 4)); return y >= 2000 && y <= 2099; },
    "Pick a date between 2000 and 2099"
  ),
});
type CreateCycleForm = z.infer<typeof createCycleSchema>;

export default function CyclesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: cycles, isLoading, isError, error, refetch } = useCycles(projectId);
  // Group by the status the dates imply, the same way the detail view does,
  // so a cycle that has started is not listed as upcoming (QA-0075).
  const cyclesWithStatus = (cycles ?? []).map((c) => ({
    cycle: c,
    derived: periodStatus({
      storedStatus: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
    }),
  }));
  const activeCycles = cyclesWithStatus
    .filter((c) => c.derived === "active" || c.derived === "ended")
    .map((c) => c.cycle);
  const upcomingCycles = cyclesWithStatus
    .filter((c) => c.derived === "upcoming")
    .map((c) => c.cycle);
  const completedCycles = cyclesWithStatus
    .filter((c) => c.derived === "completed" || c.derived === "cancelled")
    .map((c) => c.cycle);
  const [showCompleted, setShowCompleted] = useState(false);

  const createMutation = useCreateCycle();

  const handleToggleCompleted = useCallback(() => setShowCompleted((v) => !v), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const form = useForm<CreateCycleForm>({
    resolver: zodResolver(createCycleSchema),
  });

  const onSubmit = (data: CreateCycleForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          toast.success("Cycle created");
        },
        onError: (err) => toast.error((err as Error).message),
      }
    );
  };

  if (isLoading) {
    return (
      <PageWrapper title="Cycles">
        <div className="space-y-6">
          <section>
            <Skeleton className="h-4 w-16 mb-3" />
            <Card className="mb-3">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-24 mt-1" />
              </CardContent>
            </Card>
          </section>
          <section>
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <Skeleton className="h-5 w-36 mb-1" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Cycles"
      actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" aria-hidden="true" /> New Cycle
            </Button>
          </SheetTrigger>
          <SheetContent side="right" size="sm" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Create Cycle</SheetTitle>
            </SheetHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Enter cycle name..." {...form.register("name")} className="capitalize" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Optional description..." {...form.register("description")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  {/* Error above the control: the calendar popover covered it
                      below, and picking a date now clears it (QA-0025). */}
                  {form.formState.errors.startDate && (
                    <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>
                  )}
                  <DatePicker
                    id="startDate"
                    value={form.watch("startDate") || ""}
                    onChange={(v) => form.setValue("startDate", v, { shouldValidate: true })}
                    placeholder="Start date"
                    invalid={!!form.formState.errors.startDate}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End Date</Label>
                  {form.formState.errors.endDate && (
                    <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
                  )}
                  <DatePicker
                    id="endDate"
                    value={form.watch("endDate") || ""}
                    onChange={(v) => form.setValue("endDate", v, { shouldValidate: true })}
                    placeholder="End date"
                    invalid={!!form.formState.errors.endDate}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={createMutation.isPending} className="flex-1">
                  {createMutation.isPending ? "Creating..." : "Create Cycle"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      }
    >
      <div className="space-y-6">
        {isError ? (
          <QueryErrorState error={error} onRetry={refetch} />
        ) : !cycles?.length ? (
          <EmptyState
            title="No cycles yet"
            description="Create your first cycle to start planning work in time-boxed iterations."
            action={{ label: "Create First Cycle", onClick: handleOpenCreate }}
          />
        ) : (
          <>
            <StatsStrip
              items={[
                { label: "Active", value: activeCycles.length, tone: "brand", icon: Clock },
                { label: "Upcoming", value: upcomingCycles.length, icon: Calendar },
                { label: "Completed", value: completedCycles.length, tone: "success", icon: CheckCircle2 },
              ]}
            />

            {activeCycles.length > 0 && (
              <section>
                <h2 className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Active</h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {activeCycles.map((cycle) => (
                    <Link key={cycle.id} href={`/projects/${projectId}/cycles/${cycle.id}`} className="rounded-lg focus-visible:focus-ring">
                      <Card interactive className="h-full">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="truncate">{cycle.name}</CardTitle>
                            <StatusPill tone="brand" dot>Active</StatusPill>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3.5" aria-hidden="true" />
                              {formatCalendarDate(cycle.startDate)} — {formatCalendarDate(cycle.endDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="size-3.5" aria-hidden="true" />
                              {cycle.completedItems}/{cycle.totalItems} done
                            </span>
                          </div>
                          <Progress value={cycle.progress} className="h-2" />
                          <span className="mt-1 block text-xs text-muted-foreground tabular-nums">{cycle.progress}% complete</span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {upcomingCycles.length > 0 && (
              <section>
                <h2 className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {upcomingCycles.map((cycle) => (
                    <Link key={cycle.id} href={`/projects/${projectId}/cycles/${cycle.id}`} className="rounded-lg focus-visible:focus-ring">
                      <Card interactive className="h-full">
                        <CardContent className="flex items-center justify-between gap-3 py-4">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{cycle.name}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                              <Clock className="size-3" aria-hidden="true" />
                              {formatCalendarDate(cycle.startDate)} — {formatCalendarDate(cycle.endDate)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <StatusPill tone="neutral">Draft</StatusPill>
                            <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {completedCycles.length > 0 && (
              <section>
                <button
                  onClick={handleToggleCompleted}
                  className="mb-3 flex items-center gap-1 rounded-sm text-2xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:focus-ring"
                >
                  Completed ({completedCycles.length}) {showCompleted ? "▼" : "▶"}
                </button>
                {showCompleted && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {completedCycles.map((cycle) => (
                      <Link key={cycle.id} href={`/projects/${projectId}/cycles/${cycle.id}`} className="rounded-lg focus-visible:focus-ring">
                        <Card interactive className="h-full">
                          <CardContent className="flex items-center justify-between gap-3 py-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{cycle.name}</p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {cycle.completedItems}/{cycle.totalItems} {cycle.totalItems === 1 ? "item" : "items"} completed
                              </p>
                            </div>
                            <StatusPill tone="success">Completed</StatusPill>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
