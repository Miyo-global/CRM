"use client";

import React, { useCallback, useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Filter } from "lucide-react";
import { useCancelLeave, useApproveLeaveDedicated, useRejectLeaveDedicated, useRevertLeave } from "@/lib/api/hooks/hr";
import { cn } from "@/lib/utils";

import type { LeaveBalance, LeaveRequest, ApprovedLeave } from "./leaves-shared";
import { LeaveRequestTable, formatLeaveBalanceDisplay } from "./leaves-shared";
import { ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";
import { ExportButton } from "@/components/ui/export-button";
import { pluralise } from "@/lib/format-utils";


const LEAVE_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All status" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const LEAVE_PRIORITY_FILTER_OPTIONS = [
  { value: "ALL", label: "All priority" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
] as const;

interface LeavesTabContentProps {
  balances: LeaveBalance[];
  myLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek?: ApprovedLeave[];
}

export function LeavesTabContent({ balances, myLeaveRequests }: LeavesTabContentProps) {
  const { data: session } = useSession();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const isAdmin =
    session?.user?.role === "CEO" ||
    session?.user?.role === "HR" ||
    session?.user?.role === "ADMIN";

  const currentYear = new Date().getFullYear();

  // One balances row per leave type: available, used and pending days, instead
  // of a card per type plus a donut saying the same thing (B7).
  const balanceRows = useMemo(
    () =>
      balances
        .filter((bal) => bal.typeName && ALLOWED_LEAVE_TYPE_NAMES.has(bal.typeName))
        .map((bal, index) => {
          const available = parseFloat(bal.balance || "0") || 0;
          const total = bal.daysPerYear ?? 0;
          const pending = myLeaveRequests
            .filter(
              (req) =>
                (req.status ?? "PENDING") === "PENDING" &&
                req.leaveType?.name === bal.typeName,
            )
            .reduce((sum, req) => {
              const start = new Date(req.startDate);
              const end = new Date(req.endDate);
              const days = req.isHalfDay
                ? 0.5
                : differenceInCalendarDays(end, start) + 1;
              return sum + Math.max(days, 0);
            }, 0);
          return {
            key: `${bal.leaveTypeId}-${index}`,
            name: bal.typeName ?? "Leave",
            available,
            total,
            used: Math.max(total - available, 0),
            pending,
          };
        }),
    [balances, myLeaveRequests],
  );

  const leaveTypeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const req of myLeaveRequests) {
      if (req.leaveType?.name) names.add(req.leaveType.name);
    }
    return [...names].sort();
  }, [myLeaveRequests]);

  const filteredRequests = useMemo(
    () =>
      myLeaveRequests.filter((req) => {
        if (statusFilter !== "ALL" && (req.status ?? "PENDING") !== statusFilter) return false;
        if (priorityFilter !== "ALL" && (req.priority ?? "MEDIUM") !== priorityFilter) return false;
        if (typeFilter !== "ALL" && req.leaveType?.name !== typeFilter) return false;
        return true;
      }),
    [myLeaveRequests, statusFilter, priorityFilter, typeFilter],
  );

  const hasActiveFilters =
    statusFilter !== "ALL" || priorityFilter !== "ALL" || typeFilter !== "ALL";

  const handleClearFilters = useCallback(() => {
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setTypeFilter("ALL");
  }, []);

  const approveMutation = useApproveLeaveDedicated();
  const rejectMutation = useRejectLeaveDedicated();
  const revertMutation = useRevertLeave();
  const cancelMutation = useCancelLeave();

  const handleApproveRequest = useCallback((id: number) => {
    approveMutation.mutate(
      { leaveId: id },
      {
        onSuccess: () => toast.success("Leave request approved"),
        onError: (err) => toast.error(err.message || "Failed to approve"),
      },
    );
  }, [approveMutation]);

  const handleRejectRequest = useCallback((id: number, reason?: string) => {
    rejectMutation.mutate(
      { leaveId: id, reason: reason ?? "" },
      {
        onSuccess: () => toast.success("Leave request rejected"),
        onError: (err) => toast.error(err.message || "Failed to reject"),
      },
    );
  }, [rejectMutation]);

  const handleRevertRequest = useCallback((id: number) => {
    revertMutation.mutate(id, {
      onSuccess: () => toast.success("Leave request reverted to pending"),
      onError: (err) => toast.error(err.message || "Failed to revert"),
    });
  }, [revertMutation]);

  const handleCancelRequest = useCallback((id: number) => {
    cancelMutation.mutate(id, {
      onSuccess: () => toast.success("Leave request cancelled"),
      onError: (err) => toast.error(err.message || "Failed to cancel"),
    });
  }, [cancelMutation]);

  // R3-D005: one export control, the same one the rest of the product uses,
  // so the file is named for what it holds and both formats are offered.
  const exportSheets = useMemo(
    () => [
      {
        name: "Leave Requests",
        columns: [
          { header: "Type", key: "type", width: 15 },
          { header: "From", key: "from", width: 14 },
          { header: "To", key: "to", width: 14 },
          { header: "Priority", key: "priority", width: 10 },
          { header: "Status", key: "status", width: 12 },
          { header: "Reason", key: "reason", width: 30 },
          { header: "Requested On", key: "requestedOn", width: 14 },
        ],
        rows: filteredRequests.map((req) => ({
          type: req.leaveType?.name ?? "-",
          from: req.startDate,
          to: req.endDate,
          priority: req.priority ?? "Medium",
          status: req.status,
          reason: req.reason ?? "-",
          requestedOn: req.createdAt ? format(new Date(req.createdAt), "yyyy-MM-dd") : "-",
        })),
      },
    ],
    [filteredRequests],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-bold text-foreground">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Your leave balances and history for {currentYear}.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table className="tabular-nums">
          <caption className="sr-only">Leave balances for {currentYear}</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balanceRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatLeaveBalanceDisplay(row.available)}
                  {row.total > 0 ? <span className="text-muted-foreground"> of {row.total}</span> : null}
                </TableCell>
                <TableCell className="text-right font-mono">{formatLeaveBalanceDisplay(row.used)}</TableCell>
                <TableCell className="text-right font-mono">
                  {row.pending > 0 ? formatLeaveBalanceDisplay(row.pending) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-foreground">Request History</CardTitle>
              {myLeaveRequests.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Showing {filteredRequests.length} of {pluralise(myLeaveRequests.length, "request")}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(hasActiveFilters && "border-border-strong bg-accent")}
                    aria-label="Filter requests"
                  >
                    <Filter className="size-4" aria-hidden="true" />
                    Filter
                    {hasActiveFilters ? (
                      <span className="size-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-3 p-4">
                  <p className="text-sm font-medium">Filter requests</p>
                  <div className="space-y-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAVE_STATUS_FILTER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAVE_PRIORITY_FILTER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All types</SelectItem>
                        {leaveTypeOptions.map((typeName) => (
                          <SelectItem key={typeName} value={typeName}>
                            {typeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full"
                      onClick={handleClearFilters}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </PopoverContent>
              </Popover>
              <ExportButton
                filename={`leave-requests-${format(new Date(), "yyyy-MM-dd")}`}
                sheets={exportSheets}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0" aria-live="polite">
          {myLeaveRequests.length === 0 ? (
            <EmptyState
              title="No leave requests"
              description="You haven't submitted any leave requests yet."
            />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title="No matching requests"
              description="Try adjusting your filters to see more results."
              action={{ label: "Clear filters", onClick: handleClearFilters }}
            />
          ) : (
            <LeaveRequestTable
              requests={filteredRequests}
              isAdmin={isAdmin}
              isSelf
              caption="Your leave request history"
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
              onRevert={handleRevertRequest}
              onCancel={handleCancelRequest}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
