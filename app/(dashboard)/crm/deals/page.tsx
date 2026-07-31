"use client";

import {
  useState,
  useMemo,
  useCallback,
  useTransition,
  useEffect,
  useRef,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Download, LayoutGrid, TableIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DealTableView } from "@/features/crm/deals/deal-table-view";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import {
  useDeals,
  useUpdateDealStage,
  useDeleteDeal,
} from "@/lib/api/hooks/crm";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { DEAL_STAGES } from "@/features/crm/shared/constants";
import { DealSidePanel } from "@/features/crm/deals/deal-side-panel";
import { DealsStatsBar } from "@/features/crm/deals/deals-stats-bar";
import { DealForecastWidget } from "@/features/crm/deals/deal-forecast-widget";
import { DealsLoadingSkeleton } from "@/features/crm/deals/deals-loading-skeleton";
import { DealsCreateSheet } from "@/features/crm/deals/deals-create-sheet";
import { KanbanFilterBar } from "@/features/crm/deals/kanban-filter-bar";
import { KanbanColumn } from "@/features/crm/deals/kanban-column";
import { WinLossDialog } from "@/features/crm/deals/win-loss-dialog";
import { StageSkipDialog } from "@/features/crm/deals/stage-skip-dialog";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { DataTablePagination } from "@/components/shared/data-table-pagination";

const CONFETTI_COLORS = [
  "#bd882c",
  "#0f2b7f",
  "#10B981",
  "#F59E0B",
  "#3B82F6",
  "#EF4444",
  "#8B5CF6",
];

function seededFraction(seed: number): number {
  const x = Math.sin(seed * 99991) * 43758.5453;
  return x - Math.floor(x);
}

function ConfettiOverlay({ onDone }: { onDone: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timerRef.current = setTimeout(onDone, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDone]);

  const dots = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        left: `${seededFraction(i + 1) * 100}%`,
        delay: `${seededFraction(i + 2) * 1.5}s`,
        size: `${6 + seededFraction(i + 3) * 8}px`,
        duration: `${1.5 + seededFraction(i + 4) * 1.5}s`,
      })),
    [],
  );

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-dot {
          position: fixed;
          top: 0;
          border-radius: 2px;
          pointer-events: none;
          animation: confetti-fall linear forwards;
          z-index: 9999;
        }
      `}</style>
      {dots.map((d) => (
        <span
          key={d.id}
          className="confetti-dot"
          style={{
            left: d.left,
            width: d.size,
            height: d.size,
            backgroundColor: d.color,
            animationDuration: d.duration,
            animationDelay: d.delay,
          }}
        />
      ))}
    </>
  );
}

const STAGE_ORDER = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION"] as const;

export default function DealsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const view = (searchParams.get("view") || "table") as "table" | "kanban";
  const dealSortCol = searchParams.get("sort") || "createdAt";
  const dealSortDir = (searchParams.get("dir") || "desc") as "asc" | "desc";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { page, pageSize, setPage, setPageSize, resetPage } = usePaginationParams();
  const { data: dealsResult, isLoading } = useDeals({ limit: 500 });
  const allDeals = useMemo(() => dealsResult?.data ?? [], [dealsResult]);
  const { data: rawEmployees } = useHrEmployees();
  const employees = Array.isArray(rawEmployees)
    ? rawEmployees
    : (rawEmployees?.data ?? []);

  const [createOpen, setCreateOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<number | null>(null);
  const [sidePanelDealId, setSidePanelDealId] = useState<number | null>(null);
  const [winLossDialog, setWinLossDialog] = useState<{
    id: number;
    stage: "WON" | "LOST";
  } | null>(null);
  const [winLossCategory, setWinLossCategory] = useState("");
  const [winLossNotes, setWinLossNotes] = useState("");
  const [stageSkipDialog, setStageSkipDialog] = useState<{
    id: number;
    from: string;
    to: string;
    skipped: string[];
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleConfettiDone = useCallback(() => setShowConfetti(false), []);
  const handleCreateOpenChange = useCallback(
    (open: boolean) => setCreateOpen(open),
    [],
  );
  const handleCreateSuccess = useCallback(() => setCreateOpen(false), []);
  const handleSidePanelClose = useCallback(() => setSidePanelDealId(null), []);

  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterMinValue, setFilterMinValue] = useState("");
  const [filterMaxValue, setFilterMaxValue] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    assignee: string;
    minValue: string;
    maxValue: string;
  }>({ assignee: "all", minValue: "", maxValue: "" });

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({
      assignee: filterAssignee,
      minValue: filterMinValue,
      maxValue: filterMaxValue,
    });
    resetPage();
  }, [filterAssignee, filterMinValue, filterMaxValue, resetPage]);

  const handleClearFilters = useCallback(() => {
    setFilterAssignee("all");
    setFilterMinValue("");
    setFilterMaxValue("");
    setAppliedFilters({ assignee: "all", minValue: "", maxValue: "" });
  }, []);

  const hasActiveFilters =
    appliedFilters.assignee !== "all" ||
    appliedFilters.minValue !== "" ||
    appliedFilters.maxValue !== "";

  const handleDealSort = useCallback(
    (col: string) => {
      if (dealSortCol === col) {
        updateParams({
          sort: col,
          dir: dealSortDir === "asc" ? "desc" : "asc",
        });
      } else {
        updateParams({ sort: col, dir: "desc" });
      }
    },
    [dealSortCol, dealSortDir, updateParams],
  );

  const handleViewTable = useCallback(
    () => updateParams({ view: null }),
    [updateParams],
  );
  const handleViewKanban = useCallback(
    () => updateParams({ view: "kanban" }),
    [updateParams],
  );

  const handleExport = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      const rows = (allDeals || []).map((d) => ({
        name: d.name,
        value: d.value || "0",
        stage: d.stage,
        probability: `${d.probability ?? 0}%`,
        contactPerson: d.contactPerson || "",
        contactEmail: d.contactEmail || "",
        assignedTo: d.assignedTo?.name || "Unassigned",
        expectedClose: d.expectedCloseDate || "",
        createdAt: d.createdAt
          ? new Date(d.createdAt).toLocaleDateString()
          : "",
      }));
      await downloadXlsx("deals-export.xlsx", [
        {
          name: "Deals",
          columns: [
            { header: "Deal Name", key: "name", width: 25 },
            { header: "Value (INR)", key: "value", width: 15 },
            { header: "Stage", key: "stage", width: 14 },
            { header: "Probability", key: "probability", width: 12 },
            { header: "Contact Person", key: "contactPerson", width: 20 },
            { header: "Contact Email", key: "contactEmail", width: 25 },
            { header: "Assigned To", key: "assignedTo", width: 18 },
            { header: "Expected Close", key: "expectedClose", width: 14 },
            { header: "Created", key: "createdAt", width: 12 },
          ],
          rows,
        },
      ]);
      toast.success("Deals exported");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [allDeals]);

  const updateStageMutation = useUpdateDealStage();
  const deleteMutation = useDeleteDeal();

  const handleDeleteConfirm = useCallback(() => {
    if (dealToDelete) {
      deleteMutation.mutate(dealToDelete, {
        onSuccess: () => toast.success("Deal deleted"),
      });
    }
    setDealToDelete(null);
  }, [dealToDelete, deleteMutation]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDealToDelete(null);
  }, []);

  const handleStageChange = useCallback(
    (id: number, stage: string) => {
      if (stage === "WON" || stage === "LOST") {
        setWinLossDialog({ id, stage: stage as "WON" | "LOST" });
        setWinLossCategory("");
        setWinLossNotes("");
        return;
      }
      const currentDeal = allDeals?.find((d) => d.id === id);
      const currentStage = currentDeal?.stage;
      const fromIdx = STAGE_ORDER.indexOf(
        currentStage as (typeof STAGE_ORDER)[number],
      );
      const toIdx = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
      if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx + 1) {
        const skipped = STAGE_ORDER.slice(fromIdx + 1, toIdx);
        setStageSkipDialog({
          id,
          from: currentStage!,
          to: stage,
          skipped: [...skipped],
        });
        return;
      }
      const version = currentDeal?.updatedAt
        ? new Date(currentDeal.updatedAt).toISOString()
        : undefined;
      updateStageMutation.mutate(
        {
          id,
          stage: stage as
            | "LEAD"
            | "CONTACTED"
            | "PROPOSAL"
            | "NEGOTIATION"
            | "WON"
            | "LOST",
          version,
        },
        {
          onSuccess: () => toast.success("Deal stage updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateStageMutation, allDeals],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination } = result;
      if (!destination) return;
      const newStage = destination.droppableId;
      const dealId = Number(draggableId);
      const currentDeal = allDeals?.find((d) => d.id === dealId);
      if (!currentDeal || currentDeal.stage === newStage) return;
      handleStageChange(dealId, newStage);
    },
    [allDeals, handleStageChange],
  );

  const handleWinLossConfirm = useCallback(() => {
    if (!winLossDialog) return;
    const reason = winLossNotes
      ? `${winLossCategory || "Other"}: ${winLossNotes}`
      : winLossCategory || undefined;
    updateStageMutation.mutate(
      { id: winLossDialog.id, stage: winLossDialog.stage, lostReason: reason },
      {
        onSuccess: () => {
          toast.success(`Deal marked as ${winLossDialog.stage}`);
          if (winLossDialog.stage === "WON") setShowConfetti(true);
          setWinLossDialog(null);
        },
      },
    );
  }, [winLossDialog, winLossCategory, winLossNotes, updateStageMutation]);

  const handleWinLossDialogChange = useCallback((open: boolean) => {
    if (!open) setWinLossDialog(null);
  }, []);

  const handleWinLossCancel = useCallback(() => setWinLossDialog(null), []);

  const handleStageSkipDialogClose = useCallback((open: boolean) => {
    if (!open) setStageSkipDialog(null);
  }, []);

  const handleCancelSkip = useCallback(() => setStageSkipDialog(null), []);

  const handleConfirmSkip = useCallback(() => {
    if (!stageSkipDialog) return;
    updateStageMutation.mutate(
      {
        id: stageSkipDialog.id,
        stage: stageSkipDialog.to as
          | "LEAD"
          | "CONTACTED"
          | "PROPOSAL"
          | "NEGOTIATION"
          | "WON"
          | "LOST",
      },
      {
        onSuccess: () => {
          toast.success("Deal stage updated");
          setStageSkipDialog(null);
        },
      },
    );
  }, [stageSkipDialog, updateStageMutation]);

  const filteredDeals = useMemo(() => {
    if (!allDeals) return [];
    return allDeals.filter((d) => {
      if (
        appliedFilters.assignee !== "all" &&
        d.assignedToId !== appliedFilters.assignee
      )
        return false;
      if (appliedFilters.minValue !== "") {
        const min = Number(appliedFilters.minValue);
        if (!Number.isNaN(min) && Number(d.value ?? 0) < min) return false;
      }
      if (appliedFilters.maxValue !== "") {
        const max = Number(appliedFilters.maxValue);
        if (!Number.isNaN(max) && Number(d.value ?? 0) > max) return false;
      }
      return true;
    });
  }, [allDeals, appliedFilters]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, typeof allDeals> = {};
    for (const s of DEAL_STAGES) map[s.key] = [];
    filteredDeals.forEach((d) => {
      if (map[d.stage]) map[d.stage]!.push(d);
    });
    return map;
  }, [filteredDeals]);

  const assigneeOptions = useMemo(() => {
    if (!allDeals) return [];
    const seen = new Set<string>();
    const opts: { id: string; name: string }[] = [];
    for (const d of allDeals) {
      if (d.assignedToId && d.assignedTo?.name && !seen.has(d.assignedToId)) {
        seen.add(d.assignedToId);
        opts.push({ id: d.assignedToId, name: d.assignedTo.name });
      }
    }
    return opts;
  }, [allDeals]);

  const stats = useMemo(() => {
    if (!allDeals)
      return { total: 0, totalValue: 0, wonValue: 0, avgProbability: 0 };
    const active = allDeals.filter((d) => d.stage !== "LOST");
    return {
      total: allDeals.length,
      totalValue: active.reduce((s, d) => s + Number(d.value || 0), 0),
      wonValue: allDeals
        .filter((d) => d.stage === "WON")
        .reduce((s, d) => s + Number(d.value || 0), 0),
      avgProbability:
        active.length > 0
          ? Math.round(
              active.reduce((s, d) => s + (d.probability || 0), 0) /
                active.length,
            )
          : 0,
    };
  }, [allDeals]);

  const tableDeals = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDeals.slice(start, start + pageSize);
  }, [filteredDeals, page, pageSize]);

  const tableTotalPages = Math.max(1, Math.ceil(filteredDeals.length / pageSize));

  if (isLoading) return <DealsLoadingSkeleton />;

  return (
    <>
      {showConfetti && <ConfettiOverlay onDone={handleConfettiDone} />}
      <PageWrapper
        title="Deals Pipeline"
        subtitle="Track and manage your deals across stages"
        actions={
          <>
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-r-none",
                  view === "table" && "bg-gold hover:bg-gold/90 text-white",
                )}
                onClick={handleViewTable}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "kanban" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-l-none",
                  view === "kanban" && "bg-gold hover:bg-gold/90 text-white",
                )}
                onClick={handleViewKanban}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              className="bg-gold hover:bg-gold/90 text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
            <DealsCreateSheet
              open={createOpen}
              onOpenChange={handleCreateOpenChange}
              employees={employees}
              onSuccess={handleCreateSuccess}
            />
          </>
        }
      >
        <motion.div
          className="space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={fadeUp}
            className="sticky top-0 z-10 bg-background pb-2"
          >
            <DealsStatsBar {...stats} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <DealForecastWidget deals={filteredDeals} />
          </motion.div>

          {view === "table" && (
            <motion.div variants={fadeUp} className="space-y-0">
              <DealTableView
                deals={tableDeals}
                sortColumn={dealSortCol}
                sortDirection={dealSortDir}
                onSort={handleDealSort}
                onStageChange={handleStageChange}
                isLoading={isLoading}
              />
              {filteredDeals.length > 0 && (
                <DataTablePagination
                  page={page}
                  totalPages={tableTotalPages}
                  total={filteredDeals.length}
                  limit={pageSize}
                  onPageChange={setPage}
                  onLimitChange={(limit) => setPageSize(limit as import("@/lib/pagination-constants").PageSizeOption)}
                />
              )}
            </motion.div>
          )}

          {view === "kanban" && (
            <motion.div variants={fadeUp} className="space-y-3">
              <KanbanFilterBar
                assigneeOptions={assigneeOptions}
                filterAssignee={filterAssignee}
                filterMinValue={filterMinValue}
                filterMaxValue={filterMaxValue}
                hasActiveFilters={hasActiveFilters}
                onAssigneeChange={setFilterAssignee}
                onMinValueChange={setFilterMinValue}
                onMaxValueChange={setFilterMaxValue}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
              />
              <DragDropContext onDragEnd={handleDragEnd}>
                <ScrollArea className="w-full" type="auto">
                  <div className="inline-flex gap-3 sm:gap-4 pb-4">
                    {DEAL_STAGES.map((stage) => (
                      <KanbanColumn
                        key={stage.key}
                        stage={stage}
                        deals={dealsByStage[stage.key] || []}
                        onStageChange={handleStageChange}
                        onDelete={setDealToDelete}
                        onOpen={setSidePanelDealId}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </DragDropContext>
            </motion.div>
          )}

          <ConfirmDialog
            open={dealToDelete !== null}
            onOpenChange={handleDeleteDialogChange}
            title="Delete deal?"
            description="This action cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={handleDeleteConfirm}
          />

          <WinLossDialog
            dialog={winLossDialog}
            category={winLossCategory}
            notes={winLossNotes}
            isPending={updateStageMutation.isPending}
            onOpenChange={handleWinLossDialogChange}
            onCategoryChange={setWinLossCategory}
            onNotesChange={setWinLossNotes}
            onConfirm={handleWinLossConfirm}
            onCancel={handleWinLossCancel}
          />

          <StageSkipDialog
            dialog={stageSkipDialog}
            isPending={updateStageMutation.isPending}
            onOpenChange={handleStageSkipDialogClose}
            onCancel={handleCancelSkip}
            onConfirm={handleConfirmSkip}
          />
        </motion.div>
      </PageWrapper>

      <DealSidePanel dealId={sidePanelDealId} onClose={handleSidePanelClose} />
    </>
  );
}
