"use client";

import { use, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useIntakeRequests, useCreateIntakeRequest, useProject } from "@/lib/api/hooks/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/get-error-message";
import { IntakeItemCard } from "@/features/projects/intake/intake-item-card";
import { IntakeDecisionSheet, type Decision } from "@/features/projects/intake/intake-decision-sheet";
import { IntakeTriage } from "@/features/projects/intake/intake-triage";
import { IntakePublicLink } from "@/features/projects/intake/intake-public-link";
import type { IntakeRequest } from "@/types/projects";

const createIntakeSchema = z.object({
  title: z.string().trim().min(1, "Give the request a title").max(200),
  description: z.string().max(5000).optional(),
});
type CreateIntakeForm = z.infer<typeof createIntakeSchema>;

const TABS = ["pending", "accepted", "declined", "duplicate", "all"] as const;

export default function IntakePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as (typeof TABS)[number]) || "pending";
  const triage = searchParams.get("mode") === "triage";

  const [createOpen, setCreateOpen] = useState(false);
  const [deciding, setDeciding] = useState<{ item: IntakeRequest; decision: Decision } | null>(null);

  const { data: intakeData, isLoading, isError, error, refetch } = useIntakeRequests(projectId);
  const { data: project } = useProject(projectId);
  const createMutation = useCreateIntakeRequest();
  const createForm = useForm<CreateIntakeForm>({ resolver: zodResolver(createIntakeSchema) });
  const canContribute = project?.viewerRole !== "VIEWER";
  const canManage = project?.viewerRole === "OWNER" || project?.viewerRole === "MANAGER";

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null) next.delete(key);
      else next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onCreateSubmit = (data: CreateIntakeForm) =>
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          createForm.reset();
          toast.success("Added the request");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );

  const decide = useCallback((item: IntakeRequest, decision: Decision) => setDeciding({ item, decision }), []);

  const allItems = intakeData?.items ?? [];
  const pending = allItems.filter((i) => i.status === "pending");
  const filteredItems = allItems.filter((item) => tab === "all" || item.status === tab);

  return (
    <PageWrapper
      title="Intake"
      actions={
        canContribute ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={triage ? "default" : "outline"} size="sm" onClick={() => setParam("mode", triage ? null : "triage")}>
              {triage ? "Exit triage" : "Triage mode"}
            </Button>
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
              <SheetTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4" aria-hidden="true" /> New request
                </Button>
              </SheetTrigger>
              <SheetContent side="right" size="sm" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>New request</SheetTitle>
                </SheetHeader>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="intake-title">Title</Label>
                    <Input id="intake-title" {...createForm.register("title")} aria-invalid={!!createForm.formState.errors.title} />
                    {createForm.formState.errors.title && (
                      <p className="mt-1 text-xs text-destructive">{createForm.formState.errors.title.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="intake-desc">Details</Label>
                    <Textarea id="intake-desc" {...createForm.register("description")} />
                  </div>
                  <Button type="submit" loading={createMutation.isPending} className="w-full">
                    Add request
                  </Button>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-12 w-full rounded-xl" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="space-y-4">
          <IntakePublicLink projectId={projectId} token={project?.intakeToken ?? null} canManage={canManage} />
          {triage && canContribute ? (
            <IntakeTriage pending={pending} onDecide={decide} busy={!!deciding} />
          ) : (
            <Tabs value={tab} onValueChange={(v) => setParam("tab", v === "pending" ? null : v)}>
              <TabsList variant="underline">
                {TABS.map((t) => (
                  <TabsTrigger key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                    {t === "pending" && pending.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 px-1.5 tabular-nums">{pending.length}</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={tab} className="mt-4">
                {filteredItems.length === 0 ? (
                  <EmptyState
                    title={tab === "pending" ? "No requests waiting" : `No ${tab} requests`}
                    description={tab === "pending" ? "Open the public form or add a request yourself." : "Requests show up here once someone decides on them."}
                    action={tab === "pending" && canContribute ? { label: "New request", onClick: () => setCreateOpen(true) } : undefined}
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredItems.map((item) => (
                      <IntakeItemCard
                        key={item.id}
                        item={item}
                        onAccept={() => decide(item, "accept")}
                        onDecline={() => decide(item, "decline")}
                        onDuplicate={() => decide(item, "duplicate")}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {project && (
        <IntakeDecisionSheet
          decision={deciding?.decision ?? null}
          item={deciding?.item ?? null}
          project={project}
          onDone={() => setDeciding(null)}
          onCancel={() => setDeciding(null)}
        />
      )}
    </PageWrapper>
  );
}
