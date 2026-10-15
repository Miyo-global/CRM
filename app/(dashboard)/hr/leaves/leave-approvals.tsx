"use client";

import React, { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import {
  useHrPendingWfhRequests,
  useProcessWfhRequest,
  useApproveLeaveDedicated,
  useRejectLeaveDedicated,
} from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Home, CheckCircle2, XCircle, CalendarDays, Search } from "lucide-react";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from "@/lib/pagination-constants";

import type { LeaveRequest, WfhRequest } from "./leaves-shared";
import { LeaveRequestTable, WfhRequestItem, formatUserDisplayName } from "./leaves-shared";
import { canActOnLeaveRequest } from "@/lib/auth/leave-approval-roles";

const LEAVE_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const LEAVE_PRIORITY_FILTER_OPTIONS = [
  { value: "ALL", label: "All Priority" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
] as const;

type StatusTab = "all" | "pending" | "approved" | "rejected";

function filterByTab(requests: LeaveRequest[], tab: StatusTab): LeaveRequest[] {
  if (tab === "all") return requests;
  const status = tab.toUpperCase();
  return requests.filter((r) => (r.status ?? "PENDING") === status);
}

interface LeaveApprovalsTableProps {
  requests: LeaveRequest[];
  currentRole: string | null;
  currentUserId: string | null;
  onApprove: (id: number) => void;
  onReject: (id: number, reason?: string) => void;
}

function LeaveApprovalsTable({
  requests,
  currentRole,
  currentUserId,
  onApprove,
  onReject,
}: LeaveApprovalsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);

  const leaveTypeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const req of requests) {
      if (req.leaveType?.name) types.add(req.leaveType.name);
    }
    return Array.from(types).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== "ALL" && (req.status ?? "PENDING") !== statusFilter) return false;
      if (priorityFilter !== "ALL" && (req.priority ?? "MEDIUM") !== priorityFilter) return false;
      if (typeFilter !== "ALL" && req.leaveType?.name !== typeFilter) return false;
      if (!q) return true;

      const employee = formatUserDisplayName(req.user).toLowerCase();
      const email = (req.user?.email ?? "").toLowerCase();
      const typeName = (req.leaveType?.name ?? "").toLowerCase();
      const reason = (req.reason ?? "").toLowerCase();
      return employee.includes(q) || email.includes(q) || typeName.includes(q) || reason.includes(q);
    });
  }, [requests, searchQuery, statusFilter, priorityFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRequests = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, safePage, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    typeFilter !== "ALL";

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setTypeFilter("ALL");
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setPageSize(limit as PageSizeOption);
    setPage(1);
  }, []);

  if (requests.length === 0) {
    return (
      <EmptyState
        title="No leave requests"
        description="There are no leave requests to display."
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search employee, type, or reason..."
            className="h-9 pl-9"
            aria-label="Search leave requests"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-32" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAVE_STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-32" aria-label="Priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAVE_PRIORITY_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36" aria-label="Leave type">
              <SelectValue placeholder="Leave type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {leaveTypeOptions.map((typeName) => (
                <SelectItem key={typeName} value={typeName}>{typeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        <Badge variant="secondary" className="ml-auto w-fit tabular-nums">
          {filteredRequests.length} of {requests.length} requests
        </Badge>
      </div>

      {paginatedRequests.length === 0 ? (
        <EmptyState
          compact
          title={hasActiveFilters ? "No results for these filters" : "No leave requests"}
          description={hasActiveFilters ? "No leave requests match your filters." : "No leave requests to display."}
          action={hasActiveFilters ? { label: "Clear filters", onClick: handleClearFilters } : undefined}
        />
      ) : (
        <div className="w-full overflow-x-auto">
          <LeaveRequestTable
            requests={paginatedRequests}
            isAdmin
            showEmployee
            minWidth="760px"
            caption="Leave request approvals"
            canManage={(req) => canActOnLeaveRequest(currentRole, currentUserId, req)}
            onApprove={onApprove}
            onReject={onReject}
          />
        </div>
      )}

      <DataTablePagination
        page={safePage}
        totalPages={totalPages}
        total={filteredRequests.length}
        limit={pageSize}
        onPageChange={setPage}
        onLimitChange={handlePageSizeChange}
      />
    </div>
  );
}

interface PendingWfhApprovalsPanelProps {
  requests: WfhRequest[];
  currentUserId: string | null;
  isProcessingWfh: boolean;
  processingWfhId: number | null;
  onApprove: (id: number) => void;
  onRejectOpen: (id: number) => void;
}

const WFH_PENDING_PAGE_SIZE = 10 satisfies PageSizeOption;

function PendingWfhApprovalsPanel({
  requests,
  currentUserId,
  isProcessingWfh,
  processingWfhId,
  onApprove,
  onRejectOpen,
}: PendingWfhApprovalsPanelProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(WFH_PENDING_PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRequests = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [requests, safePage, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handlePageSizeChange = useCallback((limit: number) => {
    setPageSize(limit as PageSizeOption);
    setPage(1);
  }, []);

  if (requests.length === 0) {
    return (
      <EmptyState
        title="No pending WFH requests"
        description="All WFH requests have been processed."
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3" role="list" aria-label="Pending WFH approvals">
        {paginatedRequests.map((req) => (
          <WfhRequestItem
            key={req.id}
            request={req}
            showUser
            actions={
              !currentUserId || req.user?.id !== currentUserId ? (
                <WfhApprovalActions
                  requestId={req.id}
                  isProcessing={isProcessingWfh}
                  processingId={processingWfhId}
                  onApprove={onApprove}
                  onRejectOpen={onRejectOpen}
                />
              ) : undefined
            }
          />
        ))}
      </div>

      {requests.length > WFH_PENDING_PAGE_SIZE && (
        <DataTablePagination
          page={safePage}
          totalPages={totalPages}
          total={requests.length}
          limit={pageSize}
          onPageChange={setPage}
          onLimitChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}

interface LeaveApprovalsContentProps {
  incomingLeaveRequests: LeaveRequest[];
  allIncomingLeaveRequests: LeaveRequest[];
  isLoading?: boolean;
}

export function LeaveApprovalsContent({
  incomingLeaveRequests,
  allIncomingLeaveRequests,
}: LeaveApprovalsContentProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const currentRole = session?.user?.role ?? null;

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [leaveRejectOpen, setLeaveRejectOpen] = useState(false);
  const [leaveRejectingId, setLeaveRejectingId] = useState<number | null>(null);
  const [leaveRejectionReason, setLeaveRejectionReason] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const { data: pendingWfhRequests } = useHrPendingWfhRequests();
  const processWfhRequestMutation = useProcessWfhRequest();
  const approveMutation = useApproveLeaveDedicated();
  const rejectMutation = useRejectLeaveDedicated();
  const processingWfhId = processWfhRequestMutation.variables?.requestId ?? null;
  const isProcessingWfh = processWfhRequestMutation.isPending;

  const actionablePendingRequests = useMemo(
    () => incomingLeaveRequests.filter((req) => canActOnLeaveRequest(currentRole, currentUserId, req)),
    [incomingLeaveRequests, currentRole, currentUserId],
  );

  const ownPendingRequests = useMemo(
    () => incomingLeaveRequests.filter((req) => currentUserId && req.user?.id === currentUserId),
    [incomingLeaveRequests, currentUserId],
  );

  const approvedCount = useMemo(
    () => allIncomingLeaveRequests.filter((r) => r.status === "APPROVED").length,
    [allIncomingLeaveRequests],
  );
  const rejectedCount = useMemo(
    () => allIncomingLeaveRequests.filter((r) => r.status === "REJECTED").length,
    [allIncomingLeaveRequests],
  );

  const statusTabRequests = useMemo(
    () =>
      filterByTab(
        statusTab === "pending" ? incomingLeaveRequests : allIncomingLeaveRequests,
        statusTab,
      ),
    [statusTab, incomingLeaveRequests, allIncomingLeaveRequests],
  );

  // Approving pays out leave, so confirm first (A33).
  const handleApprove = useCallback((requestId: number) => {
    setApprovingId(requestId);
  }, []);

  const handleApproveConfirm = useCallback(() => {
    if (approvingId === null) return;
    approveMutation.mutate(
      { leaveId: approvingId },
      {
        onSuccess: () => toast.success("Request approved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
    setApprovingId(null);
  }, [approveMutation, approvingId]);

  const handleRejectRequest = useCallback((requestId: number) => {
    setLeaveRejectingId(requestId);
    setLeaveRejectOpen(true);
  }, []);

  const handleRejectFromTable = useCallback((requestId: number, reason?: string) => {
    if (reason !== undefined) {
      rejectMutation.mutate(
        { leaveId: requestId, reason: reason.trim() },
        {
          onSuccess: () => toast.success("Request rejected successfully"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
      return;
    }
    handleRejectRequest(requestId);
  }, [rejectMutation, handleRejectRequest]);

  const handleLeaveRejectConfirm = useCallback(() => {
    if (leaveRejectingId === null) return;
    rejectMutation.mutate(
      { leaveId: leaveRejectingId, reason: leaveRejectionReason.trim() },
      {
        onSuccess: () => {
          toast.success("Request rejected successfully");
          setLeaveRejectOpen(false);
          setLeaveRejectionReason("");
          setLeaveRejectingId(null);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [leaveRejectingId, leaveRejectionReason, rejectMutation]);

  const handleWfhApprove = useCallback((requestId: number) => {
    processWfhRequestMutation.mutate(
      { requestId, status: "APPROVED" },
      {
        onSuccess: () => toast.success("WFH request approved"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [processWfhRequestMutation]);

  const handleWfhRejectOpen = useCallback((requestId: number) => {
    setRejectingId(requestId);
    setRejectDialogOpen(true);
  }, []);

  const handleWfhRejectConfirm = useCallback(() => {
    if (rejectingId === null) return;
    processWfhRequestMutation.mutate(
      { requestId: rejectingId, status: "REJECTED", rejectionReason: rejectionReason || undefined },
      {
        onSuccess: () => {
          toast.success("WFH request rejected");
          setRejectDialogOpen(false);
          setRejectionReason("");
          setRejectingId(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [rejectingId, rejectionReason, processWfhRequestMutation]);

  return (
    <>
      <div className="space-y-6 min-h-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconChip icon={CalendarDays} size="sm" />
              Leave Requests
              {allIncomingLeaveRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{allIncomingLeaveRequests.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ownPendingRequests.length > 0 && (
              <div className="rounded-lg bg-warning-soft px-4 py-3" role="note">
                <p className="text-sm font-medium text-warning-strong">
                  You have {ownPendingRequests.length} pending leave request{ownPendingRequests.length === 1 ? "" : "s"} awaiting another approver.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  HR cannot approve their own leave — another HR member or the CEO must action those.
                </p>
              </div>
            )}

            <Tabs
              value={statusTab}
              onValueChange={(value) => setStatusTab(value as StatusTab)}
              className="space-y-4"
            >
              <TabsList variant="underline" className="overflow-x-auto">
                <TabsTrigger
                  value="all"
                >
                  All
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 justify-center px-1.5 tabular-nums">
                    {allIncomingLeaveRequests.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                >
                  Pending
                  {actionablePendingRequests.length > 0 && (
                    <Badge variant="warning" className="ml-1.5 h-5 min-w-5 justify-center px-1.5 tabular-nums">
                      {actionablePendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                >
                  Approved
                  {approvedCount > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 justify-center px-1.5 tabular-nums">
                      {approvedCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                >
                  Rejected
                  {rejectedCount > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 justify-center px-1.5 tabular-nums">
                      {rejectedCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <LeaveApprovalsTable
                key={statusTab}
                requests={statusTabRequests}
                currentRole={currentRole}
                currentUserId={currentUserId}
                onApprove={handleApprove}
                onReject={handleRejectFromTable}
              />
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconChip icon={Home} size="sm" tone="info" />
              Pending WFH Requests
              {pendingWfhRequests && pendingWfhRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingWfhRequests.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PendingWfhApprovalsPanel
              requests={(pendingWfhRequests ?? []) as WfhRequest[]}
              currentUserId={currentUserId}
              isProcessingWfh={isProcessingWfh}
              processingWfhId={processingWfhId}
              onApprove={handleWfhApprove}
              onRejectOpen={handleWfhRejectOpen}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <SheetContent size="sm" className="flex flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-6 pb-4 pt-5">
            <SheetTitle className="font-display text-lg font-bold">Reject WFH Request</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this request (optional).
            </p>
          </SheetHeader>
          <div className="flex-1 space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                placeholder="E.g. Not enough prior notice, project deadline..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleWfhRejectConfirm}
              loading={processWfhRequestMutation.isPending}
            >
              Reject Request
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={leaveRejectOpen} onOpenChange={setLeaveRejectOpen}>
        <SheetContent size="sm" className="flex flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-6 pb-4 pt-5">
            <SheetTitle className="font-display text-lg font-bold">Reject Leave Request</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this request (optional).
            </p>
          </SheetHeader>
          <div className="flex-1 space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                placeholder="E.g. Insufficient leave balance, conflicting schedule..."
                value={leaveRejectionReason}
                onChange={(e) => setLeaveRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setLeaveRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveRejectConfirm}
              loading={rejectMutation.isPending}
            >
              Reject Request
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={approvingId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setApprovingId(null);
        }}
        title="Approve this leave?"
        description="The employee is told straight away and the days come off their balance."
        confirmLabel="Approve"
        onConfirm={handleApproveConfirm}
      />

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {processWfhRequestMutation.isPending && "Processing WFH request..."}
      </div>
    </>
  );
}

function WfhApprovalActions({
  requestId,
  isProcessing,
  processingId,
  onApprove,
  onRejectOpen,
}: {
  requestId: number;
  isProcessing: boolean;
  processingId: number | null;
  onApprove: (id: number) => void;
  onRejectOpen: (id: number) => void;
}) {
  const isThisRequest = isProcessing && processingId === requestId;
  const handleApprove = useCallback(() => onApprove(requestId), [requestId, onApprove]);
  const handleReject = useCallback(() => onRejectOpen(requestId), [requestId, onRejectOpen]);

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="default" onClick={handleApprove} loading={isThisRequest} disabled={isProcessing}>
        {!isThisRequest && <CheckCircle2 className="size-4" aria-hidden="true" />}
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={handleReject} disabled={isProcessing}>
        <XCircle className="size-4" aria-hidden="true" />
        Reject
      </Button>
    </div>
  );
}
