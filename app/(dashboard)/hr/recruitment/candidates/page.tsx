"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyPersonIllustration } from "@/components/illustrations";
import Link from "next/link";
import { useCandidates, useUpdateCandidateStage, useDeleteCandidate, useBulkRejectCandidates, useJobPostings } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Search, Mail, Phone, Building2, Star, XCircle, CheckSquare, GitCompare, MoreVertical, Pencil, Trash2, Briefcase, CalendarDays, LayoutGrid, List } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Candidate, CandidateListItem, CandidateStatus, JobPostingStatus } from "@/types/hr";
import { AIScoreCandidateButton } from "@/features/hr/recruitment/ai-score-candidate-button";
import { CandidateComparisonDialog } from "@/components/hr/recruitment/candidate-comparison-dialog";
import { AddCandidateSheet } from "@/features/hr/recruitment/candidates-list/add-candidate-sheet";
import {
  EditCandidateSheet,
  type CandidateWithExtras,
} from "@/features/hr/recruitment/candidates-list/edit-candidate-sheet";
import { CandidatesTableView } from "@/features/hr/recruitment/candidates-list/candidates-table-view";
import {
  JOB_STATUS_LABELS,
  SOURCE_BADGE_CLASSES,
  SOURCE_LABELS,
  STATUSES,
  jobStatusClass,
  statusBadgeVariant,
  type CandidatesViewMode,
} from "@/features/hr/recruitment/candidates-list/candidates-list-shared";

function AppliedRoleBlock({ candidate }: { candidate: CandidateListItem }) {
  const primary = candidate.applications[0];
  const extraCount = candidate.applications.length - 1;

  if (!candidate.primaryJobTitle) {
    return (
      <div className="rounded-md border border-dashed border-amber-300/60 bg-amber-50/50 px-2.5 py-2 dark:bg-amber-950/20">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Applied role
        </p>
        <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">No job linked</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-primary/15 bg-primary/5 px-2.5 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Applied for
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-xs font-medium gap-1 max-w-full">
          <Briefcase className="h-3 w-3 shrink-0" />
          <span className="truncate">{candidate.primaryJobTitle}</span>
        </Badge>
        {primary?.jobStatus && (
          <Badge variant="outline" className={`text-[10px] ${jobStatusClass(primary.jobStatus)}`}>
            {JOB_STATUS_LABELS[primary.jobStatus]}
          </Badge>
        )}
        {extraCount > 0 && (
          <span className="text-[11px] text-muted-foreground">+{extraCount} more role{extraCount > 1 ? "s" : ""}</span>
        )}
      </div>
      {candidate.primaryAppliedAt && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          Applied {format(new Date(candidate.primaryAppliedAt), "dd MMM yyyy")}
        </p>
      )}
      {primary?.pipelineStage && primary.pipelineStage !== "APPLIED" && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Pipeline: {primary.pipelineStage.replace(/_/g, " ")}
        </p>
      )}
    </div>
  );
}

export default function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as CandidateStatus | null;
  const jobFilter = searchParams.get("jobId");
  const sourceFilter = searchParams.get("source");
  const searchQuery = searchParams.get("q") ?? "";
  const viewMode: CandidatesViewMode = searchParams.get("view") === "rows" ? "rows" : "cards";

  const listParams = useMemo(() => {
    const params: { status?: string; jobId?: number; source?: string } = {};
    if (statusFilter) params.status = statusFilter;
    if (jobFilter) params.jobId = Number(jobFilter);
    if (sourceFilter) params.source = sourceFilter;
    return Object.keys(params).length ? params : undefined;
  }, [statusFilter, jobFilter, sourceFilter]);

  const { data: candidates, isLoading } = useCandidates(listParams);
  const { data: jobPostings } = useJobPostings();
  const updateCandidateStage = useUpdateCandidateStage();
  const deleteCandidate = useDeleteCandidate();
  const bulkReject = useBulkRejectCandidates();

  const [sheetOpen, setSheetOpen] = useState(false);

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<CandidateWithExtras | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const setViewMode = useCallback(
    (mode: CandidatesViewMode) => {
      setFilter("view", mode === "rows" ? "rows" : null);
    },
    [setFilter],
  );

  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    if (!searchQuery) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.currentCompany?.toLowerCase().includes(q) ||
        c.primaryJobTitle?.toLowerCase().includes(q) ||
        c.applications.some((app) => app.jobTitle.toLowerCase().includes(q)),
    );
  }, [candidates, searchQuery]);

  const hasActiveFilters = Boolean(statusFilter || jobFilter || sourceFilter || searchQuery);

  const clearFilters = useCallback(() => {
    router.replace("/hr/recruitment/candidates", { scroll: false });
  }, [router]);

  const handleStatusChange = useCallback(
    (id: number, status: CandidateStatus) => {
      updateCandidateStage.mutate({ candidateId: id, stage: status }, {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateCandidateStage]
  );

  const openEditSheet = useCallback((candidate: Candidate) => {
    setEditingCandidate(candidate as CandidateWithExtras);
    setEditSheetOpen(true);
  }, []);

  const handleEditOpenChange = useCallback((open: boolean) => {
    setEditSheetOpen(open);
    if (!open) setEditingCandidate(null);
  }, []);

  const openDeleteDialog = useCallback((candidate: Candidate) => {
    setDeletingCandidate(candidate);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deletingCandidate) return;
    deleteCandidate.mutate(deletingCandidate.id, {
      onSuccess: () => {
        toast.success("Candidate deleted");
        setDeleteDialogOpen(false);
        setDeletingCandidate(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deletingCandidate.id);
          return next;
        });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deletingCandidate, deleteCandidate]);

  const handleToggleSelect = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredCandidates.map((c) => c.id);
    setSelectedIds((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds)
    );
  }, [filteredCandidates]);

  const handleBulkReject = useCallback(() => {
    bulkReject.mutate(
      { candidateIds: Array.from(selectedIds), sendRejectionEmail: true },
      {
        onSuccess: (res) => {
          toast.success(`${res.rejected} candidate(s) rejected, ${res.emailsSent} email(s) sent`);
          setSelectedIds(new Set());
          setBulkRejectOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [selectedIds, bulkReject]);

  if (isLoading) {
    return (
      <PageWrapper title="Candidates" subtitle="Manage your talent pipeline">
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Candidates"
      subtitle="Manage your talent pipeline"
      badge={
        hasActiveFilters && candidates
          ? `${filteredCandidates.length} of ${candidates.length} candidates`
          : `${filteredCandidates.length} candidates`
      }
      actions={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 h-8 text-xs"
                onClick={() => setBulkRejectOpen(true)}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject Selected
              </Button>
              {selectedIds.size >= 2 && selectedIds.size <= 3 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setCompareOpen(true)}
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  Compare ({selectedIds.size})
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleSelectAll}
            title={selectedIds.size === filteredCandidates.length ? "Deselect all" : "Select all"}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0
              ? "Deselect all"
              : "Select all"}
          </Button>
            <PageBackButton fallback="/hr/recruitment" />
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Candidate
          </Button>
        </div>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, role…"
              value={searchQuery}
              onChange={(e) => setFilter("q", e.target.value || null)}
              className="pl-9 w-[220px]"
            />
          </div>
          <Select value={jobFilter ?? "ALL"} onValueChange={(v) => setFilter("jobId", v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Job role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All job roles</SelectItem>
              {(jobPostings ?? []).map((job) => (
                <SelectItem key={job.id} value={String(job.id)}>
                  {job.title}
                  {job.status ? ` (${JOB_STATUS_LABELS[job.status as JobPostingStatus] ?? job.status})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter ?? "ALL"} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter ?? "ALL"} onValueChange={(v) => setFilter("source", v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sources</SelectItem>
              {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1 border rounded-md p-0.5">
            <Button
              type="button"
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2.5 gap-1.5"
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="text-xs">Cards</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "rows" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2.5 gap-1.5"
              onClick={() => setViewMode("rows")}
              aria-pressed={viewMode === "rows"}
            >
              <List className="h-3.5 w-3.5" />
              <span className="text-xs">Rows</span>
            </Button>
          </div>
        </div>
      }
    >
      {filteredCandidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <EmptyPersonIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            {searchQuery || hasActiveFilters ? "No candidates match your filters." : "No candidates yet. Add your first one!"}
          </CardContent>
        </Card>
      ) : viewMode === "rows" ? (
        <CandidatesTableView
          candidates={filteredCandidates}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onStatusChange={handleStatusChange}
          onEdit={openEditSheet}
          onDelete={openDeleteDialog}
        />
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCandidates.map((candidate) => (
            <Card
              key={candidate.id}
              className={`hover:border-primary/30 transition-colors relative ${selectedIds.has(candidate.id) ? "ring-2 ring-primary/40 border-primary/40" : ""}`}
            >
              <div
                className="absolute top-3 right-3 z-10 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => openEditSheet(candidate)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => openDeleteDialog(candidate)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Checkbox
                  checked={selectedIds.has(candidate.id)}
                  onCheckedChange={(checked) => handleToggleSelect(candidate.id, checked === true)}
                  aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
                />
              </div>
              <Link href={`/hr/recruitment/candidates/${candidate.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2 pr-14">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">
                      {candidate.firstName} {candidate.lastName}
                    </h3>
                    {candidate.currentRole && (
                      <p className="text-xs text-muted-foreground truncate">
                        Current: {candidate.currentRole}
                        {candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusBadgeVariant(candidate.status)}>{candidate.status}</Badge>
                </div>

                <div className="mb-3">
                  <AppliedRoleBlock candidate={candidate} />
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{candidate.email}</div>
                  {candidate.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{candidate.phone}</div>}
                  {candidate.source && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      <Badge variant="outline" className={SOURCE_BADGE_CLASSES[candidate.source] ?? "text-muted-foreground"}>
                        {SOURCE_LABELS[candidate.source] ?? candidate.source}
                      </Badge>
                    </div>
                  )}
                  {candidate.rating && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < candidate.rating! ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {candidate.updatedAt || candidate.createdAt
                      ? formatDistanceToNow(new Date(candidate.updatedAt ?? candidate.createdAt!), { addSuffix: true })
                      : ""}
                  </span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <AIScoreCandidateButton candidateId={candidate.id} compact />
                    <Select
                      value={candidate.status ?? "NEW"}
                      onValueChange={(v) => handleStatusChange(candidate.id, v as CandidateStatus)}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              </Link>
            </Card>
          ))}
      </div>
      )}

      <AddCandidateSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <EditCandidateSheet
        open={editSheetOpen}
        candidate={editingCandidate}
        onOpenChange={handleEditOpenChange}
      />

      <ConfirmDialog
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        title={`Reject ${selectedIds.size} candidate(s)?`}
        description="This will move all selected candidates to Rejected and send automated rejection emails. This action cannot be undone."
        confirmLabel={bulkReject.isPending ? "Rejecting..." : `Reject ${selectedIds.size} Candidate(s)`}
        destructive
        onConfirm={handleBulkReject}
      />
      {compareOpen && (
        <CandidateComparisonDialog
          candidates={filteredCandidates.filter((c) => selectedIds.has(c.id))}
          onClose={() => setCompareOpen(false)}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeletingCandidate(null); }}
        title="Delete candidate?"
        description={`This will permanently delete ${deletingCandidate?.firstName} ${deletingCandidate?.lastName} along with all their interviews, applications, and tracking data. This action cannot be undone.`}
        confirmLabel={deleteCandidate.isPending ? "Deleting..." : "Delete Candidate"}
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
