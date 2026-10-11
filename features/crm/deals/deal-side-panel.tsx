"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { DEAL_STAGE_TONE } from "./deal-stage-tone";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDealDetail,
  useUpdateDeal,
  useDealActivities,
  type DealActivity,
} from "@/lib/api/hooks/crm";
import type { DealStage } from "@/types/crm";
import { ActivityTimeline } from "./detail/activity-timeline";
import { DealEditForm, type EditFormValues } from "./detail/deal-edit-form";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { DEAL_STAGES } from "@/features/crm/shared/constants";
import { formatINRCompact } from "@/lib/format-utils";

interface DealSidePanelProps {
  dealId: number | null;
  onClose: () => void;
}

export function DealSidePanel({ dealId, onClose }: DealSidePanelProps) {
  const isOpen = dealId !== null;

  const { data: deal, isLoading: dealLoading } = useDealDetail(dealId ?? 0);
  const { data: activities, isLoading: activitiesLoading } = useDealActivities(dealId ?? 0);
  const updateDeal = useUpdateDeal();

  const stage = deal ? DEAL_STAGES.find((s) => s.key === deal.stage) : null;

  function handleSave(values: EditFormValues) {
    if (!dealId) return;
    updateDeal.mutate(
      {
        id: dealId,
        name: values.name,
        value: values.value ? values.value : undefined,
        probability: values.probability,
        stage: values.stage as DealStage,
        expectedCloseDate: values.expectedCloseDate ?? null,
        contactPerson: values.contactPerson,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        lostReason: values.lostReason,
        notes: values.notes,
      },
      {
        onSuccess: () => toast.success("Deal updated"),
        onError: () => toast.error("Failed to update deal"),
      },
    );
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent
          side="right"
          size="lg"
          className="w-full gap-0 p-0"
        >
          {dealLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : deal ? (
            <>
              <SheetHeader className="shrink-0 border-b border-border px-6 pt-5 pb-4">
                <div className="flex items-center justify-between gap-3 pr-8">
                  <div className="space-y-1 min-w-0">
                    <SheetTitle className="truncate font-display text-lg">{deal.name}</SheetTitle>
                    <div className="flex items-center gap-2">
                      {stage && (
                        <StatusPill tone={DEAL_STAGE_TONE[stage.key] ?? "neutral"} dot>
                          {stage.label}
                        </StatusPill>
                      )}
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatINRCompact(Number(deal.value ?? 0))}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link href={`/crm/deals/${deal.id}`} onClick={onClose}>
                      <ExternalLink />
                      Full Page
                    </Link>
                  </Button>
                </div>
              </SheetHeader>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:divide-x md:divide-border md:overflow-hidden">
                <ScrollArea className="min-w-0 md:flex-1">
                  <div className="p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      Deal Details
                    </h3>
                    <DealEditForm
                      deal={deal}
                      onSubmit={handleSave}
                      onCancel={onClose}
                      isPending={updateDeal.isPending}
                    />
                  </div>
                </ScrollArea>

                <div className="flex min-h-0 w-full shrink-0 flex-col border-t border-border bg-surface-sunken/40 md:w-72 md:border-t-0">
                  <div className="shrink-0 border-b border-border px-4 pt-4 pb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Activity
                    </h3>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-4">
                      {activitiesLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : (
                        <ActivityTimeline activities={(activities as DealActivity[]) ?? []} />
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Deal not found.</div>
          )}
        </SheetContent>
      </Sheet>

    </>
  );
}
