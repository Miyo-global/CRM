"use client";

import { use, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Clock, TrendingUp, Pencil } from "lucide-react";
import { useProjectBudget, useUpdateProjectBudget } from "@/lib/api/hooks/projects";
import { toast } from "sonner";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";

function StatCard({
  title,
  value,
  icon: Icon,
  subtext,
  highlight,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  subtext?: string;
  highlight?: "danger" | "success";
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                highlight === "danger"
                  ? "text-destructive"
                  : highlight === "success"
                  ? "text-green-600"
                  : ""
              }`}
            >
              {value}
            </p>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function BudgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const { data: budget, isLoading } = useProjectBudget(projectId);
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
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);

  const overBudget = (budget?.remaining ?? 0) < 0;

  return (
    <PageWrapper title="Budget" subtitle="Planned budget vs actual cost from billable timesheets">
      <div className="flex items-center justify-between mb-6">
        {editMode ? (
          <div className="flex items-center gap-2">
            <Label className="text-sm shrink-0">Planned Budget (₹)</Label>
            <Input
              type="number"
              min={0}
              max={1000000000}
              className="w-36"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder={String(budget?.plannedBudget ?? "")}
            />
            <Button size="sm" onClick={handleSaveBudget} disabled={updateBudget.isPending}>
              {updateBudget.isPending ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setNewBudget(String(budget?.plannedBudget ?? "")); setEditMode(true); }}
          >
            <Pencil className="h-4 w-4 mr-1" />
            {budget?.plannedBudget ? "Update Budget" : "Set Budget"}
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Planned Budget"
          value={fmt(budget?.plannedBudget ?? 0)}
          icon={DollarSign}
          subtext={budget?.plannedBudget ? "Project budget" : "Not set"}
        />
        <StatCard
          title="Actual Cost"
          value={fmt(budget?.actualCost ?? 0)}
          icon={TrendingUp}
          subtext={`${(budget?.totalHours ?? 0).toFixed(1)} billable hours`}
          highlight={overBudget ? "danger" : undefined}
        />
        <StatCard
          title="Remaining"
          value={fmt(Math.abs(budget?.remaining ?? 0))}
          icon={DollarSign}
          subtext={overBudget ? "Over budget" : "Available"}
          highlight={overBudget ? "danger" : "success"}
        />
      </div>

      {(budget?.plannedBudget ?? 0) > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{budget?.utilizationPct ?? 0}% used</span>
              <span>{fmt(budget?.plannedBudget ?? 0)} planned</span>
            </div>
            <Progress
              value={Math.min(budget?.utilizationPct ?? 0, 100)}
              className={`h-3 ${overBudget ? "[&>div]:bg-destructive" : ""}`}
            />
          </CardContent>
        </Card>
      )}

      {budget?.memberBreakdown && budget.memberBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Member Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {budget.memberBreakdown.map((m) => (
                <div key={m.userId} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground font-mono text-xs">{m.userId.substring(0, 8)}…</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">{m.hours.toFixed(1)} hrs</span>
                    <span className="font-medium">{fmt(m.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(budget?.memberBreakdown?.length ?? 0) === 0 && !isLoading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No billable time entries logged yet.
        </div>
      )}
    </PageWrapper>
  );
}
