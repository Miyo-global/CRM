"use client";

import React, { useCallback, useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { useSession } from "next-auth/react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaveIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, Download, CalendarDays } from "lucide-react";
import { useCancelLeave, useApproveLeaveDedicated, useRejectLeaveDedicated, useRevertLeave } from "@/lib/api/hooks/hr";
import { cn, resolveImageUrl } from "@/lib/utils";

import type { LeaveBalance, LeaveRequest, ApprovedLeave } from "./leaves-shared";
import { BalanceCard, LeaveRequestTable, formatLeaveBalanceDisplay } from "./leaves-shared";
import { ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";

const DONUT_COLORS = ["#bd882c", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6"];

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

function LeaveBalanceDonut({ balances }: { balances: LeaveBalance[] }) {
  const data = useMemo(
    () =>
      balances
        .filter(
          (b) =>
            b.typeName &&
            ALLOWED_LEAVE_TYPE_NAMES.has(b.typeName) &&
            (b.daysPerYear ?? 0) > 0,
        )
        .map((b) => ({
          name: b.typeName!,
          remaining: Math.max(0, parseFloat(b.balance || "0")),
          used: Math.max(0, (b.daysPerYear ?? 0) - parseFloat(b.balance || "0")),
          total: b.daysPerYear ?? 0,
        })),
    [balances],
  );

  if (data.length === 0) return null;

  const chartData = data.flatMap((d, i) => [
    { name: `${d.name} (used)`, value: d.used, color: DONUT_COLORS[i % DONUT_COLORS.length], opacity: 0.3 },
    { name: `${d.name} (remaining)`, value: d.remaining, color: DONUT_COLORS[i % DONUT_COLORS.length], opacity: 1 },
  ]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Balance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="h-[120px] w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={52}
                  paddingAngle={1}
                  dataKey="value"
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      fillOpacity={entry.opacity}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(value, name) => [`${value} days`, String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 flex-1 min-w-0">
            {data.map((item, i) => (
              <div key={item.name} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground shrink-0">
                    {formatLeaveBalanceDisplay(item.remaining)}/{item.total}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden ml-4">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.total > 0 ? (item.remaining / item.total) * 100 : 0}%`,
                      backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaveCalendarWidget({ approvedLeaves }: { approvedLeaves: ApprovedLeave[] }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const leavesPerDay = useMemo(
    () =>
      days.map((day) => ({
        day,
        leaves: approvedLeaves.filter((leave) => {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          return isWithinInterval(day, { start, end });
        }),
      })),
    [approvedLeaves, days],
  );

  const sortedLeavesThisWeek = useMemo(() => {
    return approvedLeaves
      .filter((leave) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        return start <= weekEnd && end >= weekStart;
      })
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
  }, [approvedLeaves, weekStart, weekEnd]);

  const hasAnyLeave = leavesPerDay.some((d) => d.leaves.length > 0);
  if (!hasAnyLeave) return null;

  const todayStr = format(today, "yyyy-MM-dd");

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          Who&apos;s Out This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {leavesPerDay.map(({ day, leaves }) => {
            const isToday = format(day, "yyyy-MM-dd") === todayStr;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "rounded-lg p-1.5 min-h-[64px] flex flex-col",
                  isToday
                    ? "bg-gold/10 border border-gold/30"
                    : "bg-muted/30 border border-transparent",
                )}
              >
                <div
                  className={cn(
                    "text-[10px] font-medium text-center leading-tight mb-1",
                    isToday ? "text-gold" : "text-muted-foreground",
                  )}
                >
                  {format(day, "EEE")}
                  <br />
                  <span className={cn("text-[11px]", isToday && "font-bold")}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {leaves.slice(0, 3).map((l) => (
                    <Avatar key={l.id} className="h-5 w-5" title={`${l.user?.firstName} ${l.user?.lastName}`}>
                      <AvatarImage src={resolveImageUrl(l.user?.image)} />
                      <AvatarFallback className="text-[8px] bg-amber-100 text-amber-700">
                        {l.user?.firstName?.[0]}
                        {l.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {leaves.length > 3 && (
                    <span className="text-[9px] text-muted-foreground self-end">
                      +{leaves.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sortedLeavesThisWeek.length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
            <ul className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {sortedLeavesThisWeek.map((leave) => {
                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);
                const name =
                  `${leave.user?.firstName ?? ""} ${leave.user?.lastName ?? ""}`.trim() ||
                  "Team member";
                const range =
                  format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")
                    ? format(start, "EEE, MMM d")
                    : `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
                const typeName = leave.leaveType?.name ?? "Leave";
                return (
                  <li
                    key={leave.id}
                    className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2"
                  >
                    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                      <AvatarImage src={resolveImageUrl(leave.user?.image)} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {leave.user?.firstName?.[0]}
                        {leave.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight truncate">
                        {name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{range}</p>
                      <p className="text-[11px] text-primary/90 font-medium mt-1">{typeName}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface LeavesTabContentProps {
  balances: LeaveBalance[];
  myLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek?: ApprovedLeave[];
}

export function LeavesTabContent({ balances, myLeaveRequests, approvedLeavesThisWeek = [] }: LeavesTabContentProps) {
  const { data: session } = useSession();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const isAdmin =
    session?.user?.role === "CEO" ||
    session?.user?.role === "HR" ||
    session?.user?.role === "ADMIN";

  const currentYear = new Date().getFullYear();

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

  const handleExportExcel = useCallback(async () => {
    if (filteredRequests.length === 0) {
      toast.error(hasActiveFilters ? "No matching leave requests to export" : "No leave requests to export");
      return;
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Leave Requests");
      ws.columns = [
        { header: "Type", width: 15 },
        { header: "From", width: 14 },
        { header: "To", width: 14 },
        { header: "Priority", width: 10 },
        { header: "Status", width: 12 },
        { header: "Reason", width: 30 },
        { header: "Requested On", width: 14 },
      ];
      ws.getRow(1).font = { bold: true };
      for (const req of filteredRequests) {
        ws.addRow([
          req.leaveType?.name || "-",
          req.startDate,
          req.endDate,
          req.priority || "Medium",
          req.status,
          req.reason || "-",
          req.createdAt ? format(new Date(req.createdAt), "yyyy-MM-dd") : "-",
        ]);
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leave-requests-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Leave requests exported!");
    } catch {
      toast.error("Failed to export");
    }
  }, [filteredRequests, hasActiveFilters]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Your leave balances and history for {currentYear}.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3" role="list" aria-label="Leave balances">
        {balances
          .filter((bal) => bal.typeName && ALLOWED_LEAVE_TYPE_NAMES.has(bal.typeName))
          .map((bal, index) => (
            <BalanceCard
              key={`${bal.leaveTypeId}-${index}`}
              typeName={bal.typeName}
              balance={bal.balance}
              daysPerYear={bal.daysPerYear}
            />
          ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LeaveBalanceDonut balances={balances} />
        <LeaveCalendarWidget approvedLeaves={approvedLeavesThisWeek} />
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-foreground">Request History</CardTitle>
              {myLeaveRequests.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Showing {filteredRequests.length} of {myLeaveRequests.length} requests
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-colors",
                      hasActiveFilters
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-label="Filter requests"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Filter
                    {hasActiveFilters ? (
                      <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                        !
                      </Badge>
                    ) : null}
                  </button>
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
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Export to Excel"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0" aria-live="polite">
          {myLeaveRequests.length === 0 ? (
            <EmptyState
              illustration={<EmptyLeaveIllustration />}
              title="No leave requests"
              description="You haven't submitted any leave requests yet."
            />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              illustration={<EmptyLeaveIllustration />}
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
