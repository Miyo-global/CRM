"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyPersonIllustration, EmptySearchIllustration } from "@/components/illustrations";
import Link from "next/link";
import { useCandidates, useUpdateCandidateStage, useDeleteCandidate, useBulkRejectCandidates, useJobPostings } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Mail, Phone, Building2, Star, XCircle, CheckSquare, GitCompare, MoreHorizontal, Pencil, Trash2, Briefcase, CalendarDays, LayoutGrid, List } from "lucide-react";
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
  JOB_STATUS_TONE,
  SOURCE_BADGE_CLASSES,
  SOURCE_LABELS,
  STATUSES,
  candidateStatusLabel,
  candidateStatusTone,
  type CandidatesViewMode,
} from "@/features/hr/recruitment/candidates-list/candidates-list-shared";

function AppliedRoleBlock({ candidate }: { candidate: CandidateListItem }) {
  const primary = candidate.applications[0];
  const extraCount = candidate.applications.length - 1;

  if (!candidate.primaryJobTitle) {
    return (
      <div className="rounded-md border border-dashed border-warning-500/40 bg-warning-soft px-2.5 py-2">
        <p className="text-2xs font-medium uppercase tracking-wide text-warning-strong">
          Applied role
        </p>
        <p className="mt-0.5 text-xs text-warning-strong">No job linked</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface-sunken px-2.5 py-2">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        Applied for
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="max-w-full gap-1 text-xs font-medium">
          <Briefcase className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate" title={candidate.primaryJobTitle}>{candidate.primaryJobTitle}</span>
        </Badge>
        {primary?.jobStatus && (
          <StatusPill tone={JOB_STATUS_TONE[primary.jobStatus] ?? "neutral"}>
            {JOB_STATUS_LABELS[primary.jobStatus]}
          </StatusPill>
        )}
        {extraCount > 0 && (
          <span className="text-2xs text-muted-foreground">+{extraCount} more role{extraCount > 1 ? "s" : ""}</span>
        )}
      </div>
      {candidate.primaryAppliedAt && (
        <p className="mt-1 flex items-center gap-1 text-2xs text-muted-foreground tabular-nums">
          <CalendarDays className="size-3" aria-hidden="true" />
          Applied {format(new Date(candidate.primaryAppliedAt), "dd MMM yyyy")}
        </p>
      )}
      {primary?.pipelineStage && primary.pipelineStage !== "APPLIED" && (
        <p className="mt-0.5 text-2xs text-muted-foreground">
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

  const { data: candidates, isLoading, isError, error, refetch } = useCandidates(listParams);
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
        <div className="flex flex-wrap items-center gap-2">
          <PageBackButton fallback="/hr/recruitment" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            title={selectedIds.size === filteredCandidates.length ? "Deselect all" : "Select all"}
          >
            <CheckSquare className="size-3.5" aria-hidden="true" />
            {selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0
              ? "Deselect all"
              : "Select all"}
          </Button>
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add Candidate
          </Button>
        </div>
      }
      filters={
        <ListToolbar
          search={{
            value: searchQuery,
            onChange: (v) => setFilter("q", v || null),
            placeholder: "Search name, email, role…",
          }}
          filters={
            <>
              <Select value={jobFilter ?? "ALL"} onValueChange={(v) => setFilter("jobId", v)}>
                <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Job role" /></SelectTrigger>
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
                <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All status</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter ?? "ALL"} onValueChange={(v) => setFilter("source", v)}>
                <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-36"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All sources</SelectItem>
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </>
          }
          view={
            <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className={cn("gap-1.5", viewMode === "cards" && "bg-card text-foreground shadow-xs hover:bg-card")}
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
              >
                <LayoutGrid className="size-3.5" aria-hidden="true" />
                Cards
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className={cn("gap-1.5", viewMode === "rows" && "bg-card text-foreground shadow-xs hover:bg-card")}
                onClick={() => setViewMode("rows")}
                aria-pressed={viewMode === "rows"}
              >
                <List className="size-3.5" aria-hidden="true" />
                Rows
              </Button>
            </div>
          }
        />
      }
    >
      {isError ? (
        <QueryErrorState title="Couldn't load candidates" error={error} onRetry={() => refetch()} />
      ) : filteredCandidates.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            illustration={<EmptySearchIllustration className="size-32" />}
            title="No results for these filters"
            description="No candidates match your filters."
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        ) : (
          <EmptyState
            illustration={<EmptyPersonIllustration className="size-32" />}
            title="No candidates yet"
            description="Add your first one!"
            action={{ label: "Add Candidate", onClick: () => setSheetOpen(true) }}
          />
        )
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredCandidates.map((candidate) => (
            <Card
              key={candidate.id}
              interactive
              className={cn("relative", selectedIds.has(candidate.id) && "border-primary ring-2 ring-ring/40")}
            >
              <div
                className="absolute top-3 right-3 z-10 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Actions for ${candidate.firstName} ${candidate.lastName}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => openEditSheet(candidate)}>
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => openDeleteDialog(candidate)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
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
              <Link
                href={`/hr/recruitment/candidates/${candidate.id}`}
                className="block rounded-lg focus-ring"
              >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start gap-3 pr-14">
                  <Avatar className="size-10">
                    <AvatarFallback className="text-sm">
                      {candidate.firstName.charAt(0)}
                      {candidate.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {candidate.firstName} {candidate.lastName}
                    </h3>
                    {candidate.currentRole && (
                      <p className="truncate text-xs text-muted-foreground">
                        Current: {candidate.currentRole}
                        {candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}
                      </p>
                    )}
                    <StatusPill tone={candidateStatusTone(candidate.status)} dot className="mt-1.5">
                      {candidateStatusLabel(candidate.status)}
                    </StatusPill>
                  </div>
                </div>

                <div className="mb-3">
                  <AppliedRoleBlock candidate={candidate} />
                </div>

                <div className="mb-4 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate" title={candidate.email}>{candidate.email}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-2 tabular-nums">
                      <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                      {candidate.phone}
                    </div>
                  )}
                  {candidate.source && (
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                      <Badge variant="outline" className={SOURCE_BADGE_CLASSES[candidate.source] ?? "text-muted-foreground"}>
                        {SOURCE_LABELS[candidate.source] ?? candidate.source}
                      </Badge>
                    </div>
                  )}
                  {candidate.rating && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          aria-hidden="true"
                          className={cn("size-3.5", i < candidate.rating! ? "fill-warning-500 text-warning-strong" : "text-muted-foreground/30")}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span
                    className="text-xs text-muted-foreground tabular-nums"
                    title={
                      candidate.updatedAt || candidate.createdAt
                        ? format(new Date(candidate.updatedAt ?? candidate.createdAt!), "dd MMM yyyy, HH:mm")
                        : undefined
                    }
                  >
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
                      <SelectTrigger size="sm" className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
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

      {selectedIds.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-sticky flex justify-center px-4">
          <div
            role="toolbar"
            aria-label="Bulk actions"
            className="pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-secondary px-4 text-secondary-foreground shadow-lg"
          >
            <span className="text-sm font-medium tabular-nums">{selectedIds.size} selected</span>
            <Button size="xs" variant="destructive" onClick={() => setBulkRejectOpen(true)}>
              <XCircle className="size-3.5" aria-hidden="true" />
              Reject Selected
            </Button>
            {selectedIds.size >= 2 && selectedIds.size <= 3 && (
              <Button
                size="xs"
                variant="ghost"
                className="text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
                onClick={() => setCompareOpen(true)}
              >
                <GitCompare className="size-3.5" aria-hidden="true" />
                Compare ({selectedIds.size})
              </Button>
            )}
            <Button
              size="xs"
              variant="ghost"
              className="text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
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
