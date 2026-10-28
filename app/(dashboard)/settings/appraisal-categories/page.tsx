"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  useAppraisalCategories,
  useCreateAppraisalCategory,
  useUpdateAppraisalCategory,
  useDeleteAppraisalCategory,
  type AppraisalCategory,
  type AppraisalRatingType,
} from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";

const RATING_TYPE_LABEL: Record<AppraisalRatingType, string> = {
  NUMERIC: "Score only",
  TEXT: "Comment only",
  BOTH: "Score and comment",
};

export default function AppraisalCategoriesSettingsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "ADMIN"]}>
      <AppraisalCategoriesContent />
    </DashboardGate>
  );
}

function AppraisalCategoriesContent() {
  const { data: categories, isLoading } = useAppraisalCategories();
  const createCat = useCreateAppraisalCategory();
  const updateCat = useUpdateAppraisalCategory();
  const deleteCat = useDeleteAppraisalCategory();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AppraisalCategory | null>(null);
  const [deleting, setDeleting] = useState<AppraisalCategory | null>(null);
  const [name, setName] = useState("");
  const [ratingType, setRatingType] = useState<AppraisalRatingType>("BOTH");
  const [weightPct, setWeightPct] = useState("20");
  const [sortOrder, setSortOrder] = useState("0");

  const sorted = useMemo(
    () => [...(categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [categories],
  );

  const openSheet = useCallback((cat: AppraisalCategory | null) => {
    setEditing(cat);
    setName(cat?.name ?? "");
    setRatingType(cat?.ratingType ?? "BOTH");
    setWeightPct(cat ? String(Math.round(Number(cat.weight) * 10000) / 100) : "20");
    setSortOrder(String(cat?.sortOrder ?? sorted.length + 1));
    setSheetOpen(true);
  }, [sorted.length]);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    const pct = Number(weightPct);
    const order = Number(sortOrder);
    if (!trimmed) return void toast.error("Category name is required");
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return void toast.error("Weight must be between 0 and 100");
    if (!Number.isInteger(order)) return void toast.error("Order must be a whole number");

    const payload = { name: trimmed, ratingType, weight: pct / 100, sortOrder: order };
    const opts = {
      onSuccess: () => {
        toast.success(editing ? "Category updated" : "Category added");
        setSheetOpen(false);
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    };
    if (editing) updateCat.mutate({ id: editing.id, ...payload }, opts);
    else createCat.mutate(payload, opts);
  }, [name, ratingType, weightPct, sortOrder, editing, createCat, updateCat]);

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    deleteCat.mutate(deleting.id, {
      onSuccess: () => toast.success("Category deleted"),
      // A category already scored on an appraisal comes back 409.
      onError: (e) => toast.error(getErrorMessage(e)),
    });
    setDeleting(null);
  }, [deleting, deleteCat]);

  return (
    <PageWrapper
      title="Appraisal categories"
      actions={
        <Button size="sm" onClick={() => openSheet(null)}>
          <Plus aria-hidden />
          Add category
        </Button>
      }
    >
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Rating categories</h2>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Every new appraisal on{" "}
            <Link href="/hr/performance?tab=appraisals" className="text-brand-text underline underline-offset-2">
              Performance
            </Link>{" "}
            is scored on these categories. Weights are relative: the overall rating is the weighted
            average of the scored categories. Changes apply to appraisals created afterwards.
          </p>
        </div>
        {isLoading ? (
          <div className="p-5">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              icon={ClipboardList}
              title="No categories configured yet. Add one to enable appraisal scoring."
              action={{ label: "Add category", onClick: () => openSheet(null) }}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Rated by</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.name}</span>
                      {cat.orgId == null && <StatusPill tone="info">Default</StatusPill>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{RATING_TYPE_LABEL[cat.ratingType] ?? cat.ratingType}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {cat.ratingType === "TEXT" ? "—" : `${Math.round(Number(cat.weight) * 10000) / 100}%`}
                  </TableCell>
                  <TableCell>
                    {cat.orgId != null && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => openSheet(cat)}
                          aria-label={`Edit ${cat.name}`}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleting(cat)}
                          disabled={deleteCat.isPending}
                          aria-label={`Delete ${cat.name}`}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete category?"
        description={`"${deleting?.name ?? ""}" will be removed. Categories already scored on an appraisal cannot be deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Edit category" : "Add category"}
        description="Categories are scored by the employee (self review) and their manager."
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save changes" : "Add category"}
        isPending={createCat.isPending || updateCat.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="cat-name" className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cat-name"
            value={name}
            maxLength={200}
            placeholder="e.g. Communication Skills"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-type" className="text-sm font-medium">Rating</Label>
          <Select value={ratingType} onValueChange={(v) => setRatingType(v as AppraisalRatingType)}>
            <SelectTrigger id="cat-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RATING_TYPE_LABEL) as AppraisalRatingType[]).map((t) => (
                <SelectItem key={t} value={t}>{RATING_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-weight" className="text-sm font-medium">Weight (%)</Label>
            <Input
              id="cat-weight"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              value={weightPct}
              disabled={ratingType === "TEXT"}
              onChange={(e) => setWeightPct(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-order" className="text-sm font-medium">Order</Label>
            <Input
              id="cat-order"
              type="number"
              inputMode="numeric"
              step="1"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
