"use client";

import { use, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsStrip } from "@/components/shared/stats-strip";
import { IndianRupee, Clock, TrendingUp, Pencil } from "lucide-react";
import { useProjectBudget, useUpdateProjectBudget } from "@/lib/api/hooks/projects";
import { toast } from "sonner";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";

export default function BudgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const { data: budget, isLoading, isError, error, refetch } = useProjectBudget(projectId);
  const updateBudget = useUpdateProjectBudget(projectId);

  const [editMode, setEditMode] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  function handleSaveBudget() {
    const val = Number(newBudget);
    if (!Number.isFinite(val) || val < 0 || val > 1000000000) { toast.error("Enter a valid non-negative budget"); return; }
    updateBudget.mutate(val, {
      onSuccess: () => { toast.success("Budget updated"); setEditMode(false); },
      onError: () => toast.error("Failed to update budget"),
    });
  }

  if (isLoading) {
    return (
      <PageWrapper title="Budget">
        <Skeleton className="h-20 w-full rounded-lg" />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Budget">
        <QueryErrorState error={error} onRetry={refetch} />
      </PageWrapper>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);

  const overBudget = (budget?.remaining ?? 0) < 0;

  return (
    <PageWrapper
      title="Budget"
      actions={
        editMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="planned-budget" className="shrink-0 text-sm">Planned Budget (₹)</Label>
            <Input
              id="planned-budget"
              type="number"
              min={0}
              max={1000000000}
              className="w-36 tabular-nums"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder={String(budget?.plannedBudget ?? "")}
            />
            <Button size="sm" onClick={handleSaveBudget} loading={updateBudget.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setNewBudget(String(budget?.plannedBudget ?? "")); setEditMode(true); }}
          >
            <Pencil className="size-4" aria-hidden="true" />
            {budget?.plannedBudget ? "Update Budget" : "Set Budget"}
          </Button>
        )
      }
    >
      <div className="space-y-6">
      <StatsStrip
        items={[
          {
            label: "Planned Budget",
            value: fmt(budget?.plannedBudget ?? 0),
            icon: IndianRupee,
            hint: budget?.plannedBudget ? "Project budget" : "Not set",
          },
          {
            label: "Actual Cost",
            value: fmt(budget?.actualCost ?? 0),
            icon: TrendingUp,
            hint: `${(budget?.totalHours ?? 0).toFixed(1)} billable hours`,
            tone: overBudget ? "danger" : undefined,
          },
          {
            label: "Remaining",
            value: fmt(Math.abs(budget?.remaining ?? 0)),
            icon: IndianRupee,
            hint: overBudget ? "Over budget" : "Available",
            tone: overBudget ? "danger" : "success",
          },
        ]}
      />

      {(budget?.plannedBudget ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>{budget?.utilizationPct ?? 0}% used</span>
              <span>{fmt(budget?.plannedBudget ?? 0)} planned</span>
            </div>
            <Progress
              value={Math.min(budget?.utilizationPct ?? 0, 100)}
              className="h-2.5"
              tone={overBudget ? "danger" : undefined}
            />
          </CardContent>
        </Card>
      )}

      {budget?.memberBreakdown && budget.memberBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Member Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Member</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="pr-5 text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budget.memberBreakdown.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2">
                        <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        <span className="font-mono text-xs text-muted-foreground" title={m.userId}>{m.userId.substring(0, 8)}…</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">{m.hours.toFixed(1)} hrs</TableCell>
                    <TableCell className="pr-5 text-right font-medium tabular-nums">{fmt(m.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(budget?.memberBreakdown?.length ?? 0) === 0 && !isLoading && (
        <EmptyState
          compact
          title="No billable time entries logged yet."
        />
      )}
      </div>
    </PageWrapper>
  );
}
