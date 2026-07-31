"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { HrSheet } from "@/features/hr/hr-sheet";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus, Award, CheckCircle2, XCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { CareerPromotionRecommendation, CareerLadder, CareerPromotionStatus } from "@/types/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import type { Employee } from "@/types/hr";

const promoKeys = {
  list: () => ["hr", "career-promotions", "list"] as const,
};
const ladderKeys = {
  list: () => ["hr", "career-ladders", "list"] as const,
};

const STATUS_BADGE: Record<CareerPromotionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "outline" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  WITHDRAWN: { label: "Withdrawn", variant: "secondary" },
};

const EMPTY_FORM = {
  employeeUserId: "",
  ladderId: "",
  fromLevel: "",
  toLevel: "",
  reason: "",
  effectiveDate: "",
};

export default function CareerPromotionsPage() {
  const { data: session } = useSession();
  const isAdmin = ["CEO", "HR", "ADMIN"].includes(session?.user?.role ?? "");
  const qc = useQueryClient();

  const { data: promotions, isLoading } = useQuery({
    queryKey: promoKeys.list(),
    queryFn: () => apiClient.get<CareerPromotionRecommendation[]>("/hr/career-promotions"),
  });

  const { data: laddersRaw } = useQuery({
    queryKey: ladderKeys.list(),
    queryFn: () => apiClient.get<CareerLadder[]>("/hr/career-ladders"),
  });

  const { data: employeesRaw } = useHrEmployees({ limit: 200 });

  const employees = useMemo(() => {
    const raw = employeesRaw as { data?: Employee[]; items?: Employee[] } | Employee[] | undefined;
    const list: Employee[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
    return list.map((e) => ({
      value: e.id,
      label: [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email || e.id,
    }));
  }, [employeesRaw]);

  const ladders: CareerLadder[] = Array.isArray(laddersRaw) ? laddersRaw : [];

  const [addOpen, setAddOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<CareerPromotionRecommendation | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const createPromo = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<CareerPromotionRecommendation>("/hr/career-promotions", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: promoKeys.list() }),
  });

  const reviewPromo = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiClient.patch<CareerPromotionRecommendation>(`/hr/career-promotions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: promoKeys.list() }),
  });

  const handleCreate = useCallback(() => {
    if (!form.employeeUserId) { toast.error("Select an employee"); return; }
    const toLevel = parseInt(form.toLevel);
    if (!toLevel || toLevel < 1) { toast.error("Target level is required"); return; }
    const fromLevel = form.fromLevel ? parseInt(form.fromLevel) : null;
    if (fromLevel !== null && toLevel <= fromLevel) { toast.error("Target level must be higher than current level"); return; }

    createPromo.mutate(
      {
        employeeUserId: form.employeeUserId,
        ladderId: form.ladderId ? parseInt(form.ladderId) : null,
        fromLevel,
        toLevel,
        reason: form.reason.trim() || null,
        effectiveDate: form.effectiveDate || null,
      },
      {
        onSuccess: () => {
          toast.success("Promotion recommendation submitted");
          setAddOpen(false);
          setForm(EMPTY_FORM);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [form, createPromo]);

  const handleReview = useCallback(() => {
    if (!reviewTarget || !reviewAction) return;
    reviewPromo.mutate(
      {
        id: reviewTarget.id,
        data: { status: reviewAction, reviewNotes: reviewNotes.trim() || null },
      },
      {
        onSuccess: () => {
          toast.success(reviewAction === "APPROVED" ? "Promotion approved" : "Recommendation rejected");
          setReviewTarget(null);
          setReviewAction(null);
          setReviewNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [reviewTarget, reviewAction, reviewNotes, reviewPromo]);

  const rows: CareerPromotionRecommendation[] = Array.isArray(promotions) ? promotions : [];

  if (isLoading) {
    return (
      <PageWrapper title="Promotions" subtitle="Promotion recommendations and approvals">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      </PageWrapper>
    );
  }

  const levelOptions = Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: `Level ${i + 1}`,
  }));

  return (
    <PageWrapper
      title="Promotions"
      subtitle="Recommend and approve employee promotions"
      badge={`${rows.filter((r) => r.status === "PENDING").length} pending`}
      actions={
        isAdmin ? (
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Recommend Promotion
          </Button>
        ) : undefined
      }
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[780px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Ladder</TableHead>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead className="text-right w-[120px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Award className="h-10 w-10 opacity-30" />
                        <p className="text-sm">No promotion recommendations yet.</p>
                        {isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Recommend Promotion
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((rec) => {
                    const badge = STATUS_BADGE[rec.status];
                    return (
                      <TableRow key={rec.id}>
                        <TableCell className="text-sm font-medium">{rec.employeeName ?? rec.employeeUserId}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {rec.ladderTitle ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            {rec.fromLevel ? (
                              <><Badge variant="outline" className="text-[10px]">L{rec.fromLevel}</Badge>
                              <span className="text-muted-foreground">→</span></>
                            ) : null}
                            <Badge variant="secondary" className="text-[10px]">L{rec.toLevel}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                          <p className="line-clamp-2">{rec.reason ?? "—"}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {rec.createdAt ? format(new Date(rec.createdAt), "dd MMM yyyy") : "—"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            {rec.status === "PENDING" && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-green-600"
                                  title="Approve"
                                  onClick={() => { setReviewTarget(rec); setReviewAction("APPROVED"); setReviewNotes(""); }}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  title="Reject"
                                  onClick={() => { setReviewTarget(rec); setReviewAction("REJECTED"); setReviewNotes(""); }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      <HrSheet
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setForm(EMPTY_FORM); }}
        title="Recommend Promotion"
        description="Submit a promotion recommendation for review."
        onSubmit={handleCreate}
        submitLabel="Submit Recommendation"
        isPending={createPromo.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
            <SearchableSelect
              options={employees}
              value={form.employeeUserId}
              onValueChange={(v) => setForm((f) => ({ ...f, employeeUserId: v }))}
              placeholder="Select employee"
              searchPlaceholder="Search employees…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Career Ladder</label>
            <SearchableSelect
              options={[{ value: "", label: "No ladder" }, ...ladders.map((l) => ({ value: String(l.id), label: l.title }))]}
              value={form.ladderId}
              onValueChange={(v) => setForm((f) => ({ ...f, ladderId: v }))}
              placeholder="Select ladder"
              searchPlaceholder="Search…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Current Level</label>
              <SearchableSelect
                options={[{ value: "", label: "Unknown" }, ...levelOptions]}
                value={form.fromLevel}
                onValueChange={(v) => setForm((f) => ({ ...f, fromLevel: v }))}
                placeholder="Current"
                searchPlaceholder="Search…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Level <span className="text-destructive">*</span></label>
              <SearchableSelect
                options={levelOptions}
                value={form.toLevel}
                onValueChange={(v) => setForm((f) => ({ ...f, toLevel: v }))}
                placeholder="Target"
                searchPlaceholder="Search…"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Effective Date</label>
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Why is this employee ready for promotion…"
              rows={4}
              maxLength={2000}
            />
          </div>
        </div>
      </HrSheet>

      <HrSheet
        open={reviewTarget !== null && reviewAction !== null}
        onOpenChange={(o) => { if (!o) { setReviewTarget(null); setReviewAction(null); setReviewNotes(""); } }}
        title={reviewAction === "APPROVED" ? "Approve Promotion" : "Reject Recommendation"}
        description={
          reviewAction === "APPROVED"
            ? `Approve promotion for ${reviewTarget?.employeeName ?? "this employee"} to Level ${reviewTarget?.toLevel}. Their career profile will be updated automatically.`
            : "Reject this promotion recommendation. No profile changes will be made."
        }
        onSubmit={handleReview}
        submitLabel={reviewAction === "APPROVED" ? "Approve" : "Reject"}
        isPending={reviewPromo.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Review Notes</label>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Optional notes for the record…"
            rows={4}
            maxLength={2000}
          />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
