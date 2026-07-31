"use client";

import { use, useState, useCallback } from "react";
import { useCycles, useCreateCycle } from "@/lib/api/hooks/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyCalendarIllustration } from "@/components/illustrations";
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

const createCycleSchema = z.object({
  name: z.string().min(1, "Name is required").regex(/^[A-Za-z]/, "Name must start with a letter").max(100),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date required").refine(
    (v) => { const y = new Date(v).getFullYear(); return y >= 2000 && y <= 2099; },
    "Year must be between 2000 and 2099"
  ),
  endDate: z.string().min(1, "End date required").refine(
    (v) => { const y = new Date(v).getFullYear(); return y >= 2000 && y <= 2099; },
    "Year must be between 2000 and 2099"
  ),
});
type CreateCycleForm = z.infer<typeof createCycleSchema>;

export default function CyclesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: cycles, isLoading } = useCycles(projectId);
  const activeCycles = cycles?.filter((c) => c.status === "active") ?? [];
  const upcomingCycles = cycles?.filter((c) => c.status === "draft") ?? [];
  const completedCycles = cycles?.filter((c) => c.status === "completed") ?? [];
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
              <Plus className="h-4 w-4 mr-1" /> New Cycle
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  <DatePicker id="startDate" value={form.watch("startDate") || ""} onChange={(v) => form.setValue("startDate", v)} placeholder="Start date" />
                  {form.formState.errors.startDate && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.startDate.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End Date</Label>
                  <DatePicker id="endDate" value={form.watch("endDate") || ""} onChange={(v) => form.setValue("endDate", v)} placeholder="End date" />
                  {form.formState.errors.endDate && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.endDate.message}</p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Cycle"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      }
    >
      <div className="space-y-6">
        {activeCycles.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active</h2>
            {activeCycles.map((cycle) => (
              <Link key={cycle.id} href={`/projects/${projectId}/cycles/${cycle.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{cycle.name}</CardTitle>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {cycle.completedItems}/{cycle.totalItems} done
                      </span>
                    </div>
                    <Progress value={cycle.progress} className="h-2" />
                    <span className="text-xs text-muted-foreground mt-1 block">{cycle.progress}% complete</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </section>
        )}

        {upcomingCycles.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h2>
            <div className="space-y-3">
              {upcomingCycles.map((cycle) => (
                <Link key={cycle.id} href={`/projects/${projectId}/cycles/${cycle.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{cycle.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Draft</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
              className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground transition-colors"
            >
              Completed ({completedCycles.length}) {showCompleted ? "▼" : "▶"}
            </button>
            {showCompleted && (
              <div className="space-y-3">
                {completedCycles.map((cycle) => (
                  <Link key={cycle.id} href={`/projects/${projectId}/cycles/${cycle.id}`}>
                    <Card className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                      <CardContent className="py-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{cycle.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {cycle.completedItems}/{cycle.totalItems} items completed
                          </p>
                        </div>
                        <Badge variant="outline">Completed</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {!cycles?.length && (
          <EmptyState
            illustration={<EmptyCalendarIllustration className="h-32 w-32 opacity-95" />}
            title="No cycles yet"
            description="Create your first cycle to start planning work in time-boxed iterations."
            action={{ label: "Create First Cycle", onClick: handleOpenCreate }}
          />
        )}
      </div>
    </PageWrapper>
  );
}
