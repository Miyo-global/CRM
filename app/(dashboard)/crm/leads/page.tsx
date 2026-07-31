"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { DropResult } from "@hello-pangea/dnd";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CsvUploadDialog } from "@/features/crm/leads/csv-upload-dialog";
import { LeadTableView } from "@/features/crm/leads/lead-table-view";
import { LeadExportDialog } from "@/features/crm/leads/lead-export-dialog";
import {
  useLeadBoard, useLeadStats, useCreateLead, useUpdateLeadStatus,
  useLeads, useSalesTeamCapacity, useUpdateLead, useAssignLead,
  useBulkUpdateLeads, useBulkDeleteLeads,
} from "@/lib/api/hooks/leads";
import { useCreateDeal } from "@/lib/api/hooks/crm";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useLeadsFilters } from "@/hooks/use-leads-filters";
import { useSession } from "next-auth/react";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { toast } from "sonner";
import { LeadsStatsBar } from "@/features/crm/leads/leads-stats-bar";
import { LeadsToolbar } from "@/features/crm/leads/leads-toolbar";
import { LeadsKanban } from "@/features/crm/leads/leads-kanban";
import { LeadDetailSheet } from "@/features/crm/leads/lead-detail-sheet";
import { CreateLeadSheet } from "@/features/crm/leads/create-lead-sheet";
import { isLeadSource, isLeadPriority, STATUS_CONFIG } from "@/features/crm/leads/leads-constants";
import type { BoardLead, LeadStatus } from "@/features/crm/leads/leads-types";

export default function LeadsPipelinePage() {
  const { data: board, isLoading: boardLoading } = useLeadBoard();
  const { data: stats, isLoading: statsLoading } = useLeadStats();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const {
    view,
    searchQuery,
    statusFilter,
    priorityFilter,
    sourceFilter,
    sortColumn,
    sortDirection,
    tablePage,
    pageSize,
    setView,
    setSearchQuery,
    setStatusFilter,
    setPriorityFilter,
    setSourceFilter,
    setSort,
    setTablePage,
    setPageSize,
    clearFilters,
  } = useLeadsFilters();

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const apiSearchQuery = debouncedSearchQuery.length >= 3 || debouncedSearchQuery.length === 0 ? debouncedSearchQuery : "";

  const { data: tableData, isLoading: tableLoading } = useLeads({
    search: apiSearchQuery || undefined,
    sortBy: sortColumn as "name" | "email" | "company" | "status" | "priority" | "source" | "score" | "potentialValue" | "createdAt",
    sortOrder: sortDirection,
    page: tablePage,
    limit: pageSize,
    status: statusFilter as "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST" | undefined,
    priority: priorityFilter as "HOT" | "WARM" | "COLD" | undefined,
    source: sourceFilter as "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other" | undefined,
  });

  const { data: teamCapacity } = useSalesTeamCapacity();
  const teamMembers = useMemo(
    () => (teamCapacity || []).map(m => ({ id: m.id, name: m.name, image: m.image })),
    [teamCapacity],
  );

  const updateLeadMutation = useUpdateLead();
  const assignLeadMutation = useAssignLead();
  const createDealMutation = useCreateDeal();
  const bulkUpdateMutation = useBulkUpdateLeads();
  const bulkDeleteMutation = useBulkDeleteLeads();

  const { data: session } = useSession();
  const createLead = useCreateLead();
  const updateStatus = useUpdateLeadStatus();

  const isAdmin = ADMIN_ROLES.includes(session?.user?.role ?? "");

  const handleCloseDetail = useCallback(() => setSelectedLeadId(null), []);

  const handleSort = useCallback((col: string) => {
    const newDir = sortColumn === col
      ? (sortDirection === "asc" ? "desc" : "asc")
      : "desc";
    setSort(col, newDir);
  }, [sortColumn, sortDirection, setSort]);

  const handleViewChange = useCallback((v: "table" | "kanban") => {
    setView(v);
  }, [setView]);

  const filteredBoard = useMemo(() => {
    if (!board) return null;
    if (!debouncedSearchQuery || debouncedSearchQuery.length < 3) return board;
    const q = debouncedSearchQuery.toLowerCase();
    const filtered: Record<string, typeof board[keyof typeof board]> = {};
    for (const [status, leads] of Object.entries(board)) {
      filtered[status] = leads.filter((l: BoardLead) =>
        l.name.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.company?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [board, debouncedSearchQuery]);

  const handleCreateLead = useCallback(async (formData: FormData) => {
    const name = (formData.get("name") as string)?.trim();
    if (!name) { toast.error("Name is required"); return; }

    const potentialValueRaw = (formData.get("potentialValue") as string)?.trim();
    const investmentInterestRaw = (formData.get("investmentInterest") as string)?.trim();

    if (potentialValueRaw && (isNaN(Number(potentialValueRaw)) || Number(potentialValueRaw) < 0)) {
      toast.error("Potential value must be a valid positive number"); return;
    }
    if (investmentInterestRaw && (isNaN(Number(investmentInterestRaw)) || Number(investmentInterestRaw) < 0)) {
      toast.error("Investment interest must be a valid positive number"); return;
    }

    const data = {
      name,
      email: (formData.get("email") as string)?.trim() || undefined,
      phone: (formData.get("phone") as string)?.trim() || undefined,
      company: (formData.get("company") as string)?.trim() || undefined,
      source: isLeadSource(formData.get("source")) ? formData.get("source") as "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other" : "other",
      potentialValue: potentialValueRaw || undefined,
      investmentInterest: investmentInterestRaw || undefined,
      priority: isLeadPriority(formData.get("priority")) ? formData.get("priority") as "HOT" | "WARM" | "COLD" : "WARM" as const,
      notes: (formData.get("notes") as string)?.trim() || undefined,
      city: (formData.get("city") as string)?.trim() || undefined,
      referredBy: (formData.get("referredBy") as string)?.trim() || undefined,
    };

    try {
      await createLead.mutateAsync(data);
      toast.success("Lead created successfully");
      setCreateOpen(false);
    } catch {
      toast.error("Failed to create lead");
    }
  }, [createLead]);

  const handleMoveStatus = useCallback(async (leadId: number, status: LeadStatus, expectedStatus?: LeadStatus) => {
    try {
      await updateStatus.mutateAsync({ leadId, status, expectedStatus });
      toast.success(`Lead moved to ${STATUS_CONFIG[status].label}`);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Failed to update status");
    }
  }, [updateStatus]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const leadId = parseInt(draggableId);
    const newStatus = destination.droppableId as LeadStatus;
    if (source.droppableId !== destination.droppableId) {
      handleMoveStatus(leadId, newStatus, source.droppableId as LeadStatus);
    }
  }, [handleMoveStatus]);

  const handleStatusChange = useCallback((
    id: number,
    status: string,
    extra?: { conversionNotes?: string; lostReason?: string; estimatedAmount?: string; investmentInterest?: string; createDeal?: boolean; dealName?: string },
  ) => {
    if (status === "CONVERTED" && extra) {
      updateStatus.mutate(
        {
          leadId: id,
          status: "CONVERTED",
          estimatedInvestment: extra.estimatedAmount || extra.investmentInterest || undefined,
          conversionNotes: extra.conversionNotes,
        },
        {
          onSuccess: () => toast.success("Lead converted — client account created"),
          onError: (err) => toast.error(`Conversion failed: ${err.message}`),
        },
      );

      if (extra.createDeal && extra.dealName) {
        createDealMutation.mutate(
          {
            name: extra.dealName,
            value: extra.estimatedAmount || undefined,
            stage: "LEAD",
            notes: extra.conversionNotes,
            leadId: id,
          },
          {
            onSuccess: () => toast.success("Deal created from converted lead"),
            onError: (err) => toast.error(`Deal creation failed: ${err.message}`),
          },
        );
      }
    } else if (status === "LOST" && extra) {
      updateStatus.mutate({ leadId: id, status: "LOST", lostReason: extra.lostReason });
    } else {
      updateStatus.mutate({ leadId: id, status: status as LeadStatus });
    }
  }, [updateLeadMutation, updateStatus, createDealMutation]);

  const handlePriorityChange = useCallback((id: number, priority: string) => {
    updateLeadMutation.mutate({ id, priority: priority as "HOT" | "WARM" | "COLD" });
  }, [updateLeadMutation]);

  const handleAssign = useCallback((id: number, userId: string) => {
    assignLeadMutation.mutate(
      { leadId: id, assignedToId: userId },
      {
        onSuccess: () => toast.success("Lead assigned"),
        onError: (err) => toast.error(err.message),
      },
    );
  }, [assignLeadMutation]);

  const handleBulkUpdate = useCallback((
    ids: number[],
    update: { status?: string; priority?: string; assignedToId?: string },
  ) => {
    bulkUpdateMutation.mutate(
      { leadIds: ids, update: update as { status?: "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST"; priority?: "HOT" | "WARM" | "COLD"; assignedToId?: string } },
      {
        onSuccess: (data) => toast.success(`${data.updated} leads updated`),
        onError: (err) => toast.error(err.message),
      },
    );
  }, [bulkUpdateMutation]);

  const handleBulkDelete = useCallback((ids: number[]) => {
    bulkDeleteMutation.mutate(
      { leadIds: ids },
      {
        onSuccess: (data) => toast.success(`${data.deleted} leads deleted`),
        onError: (err) => toast.error(err.message),
      },
    );
  }, [bulkDeleteMutation]);

  if (boardLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-96" />)}
        </div>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Lead Pipeline"
      subtitle="Track and manage leads through the conversion funnel"
      badge={view === "table" && tableData ? String(tableData.totalCount) : undefined}
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <LeadExportDialog />
          <CsvUploadDialog />
          <CreateLeadSheet
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={handleCreateLead}
            isPending={createLead.isPending}
          />
        </div>
      }
      filters={
        <LeadsToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          view={view}
          onViewChange={handleViewChange}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          sourceFilter={sourceFilter}
          onStatusFilterChange={setStatusFilter}
          onPriorityFilterChange={setPriorityFilter}
          onSourceFilterChange={setSourceFilter}
          onClearFilters={clearFilters}
        />
      }
    >
      <div className="flex flex-col h-full min-h-0">
        {stats && (
          <div className="shrink-0">
            <LeadsStatsBar stats={stats} />
          </div>
        )}

        {view === "table" && (
          <div className="flex-1 min-h-0 mt-2">
            <LeadTableView
              leads={tableData?.leads || []}
              totalCount={tableData?.totalCount || 0}
              page={tableData?.page || 1}
              totalPages={tableData?.totalPages || 1}
              pageSize={pageSize}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onPageChange={setTablePage}
              onPageSizeChange={setPageSize}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onAssign={handleAssign}
              onBulkUpdate={handleBulkUpdate}
              onBulkDelete={handleBulkDelete}
              teamMembers={teamMembers}
              isLoading={tableLoading}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {view === "kanban" && (
          <div className="flex-1 min-h-0 mt-2 overflow-auto">
            <LeadsKanban
              filteredBoard={filteredBoard as Record<string, BoardLead[]> | null}
              onDragEnd={handleDragEnd}
              onOpenLead={setSelectedLeadId}
              onMoveStatus={handleMoveStatus}
            />
          </div>
        )}

        <LeadDetailSheet
          leadId={selectedLeadId}
          open={!!selectedLeadId}
          onClose={handleCloseDetail}
          onMoveStatus={handleMoveStatus}
        />
      </div>
    </PageWrapper>
  );
}
