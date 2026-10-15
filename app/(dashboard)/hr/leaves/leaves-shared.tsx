"use client";

import React, { useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

import {
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Heart,
  Palmtree,
  MoreVertical,
  Eye,
  Check,
  X,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import { resolveImageUrl } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { PropertyList } from "@/components/shared/property-list";
import type { Tone } from "@/lib/design/tones";

export interface LeaveBalance {
  id: number;
  leaveTypeId: number | null;
  balance: string;
  typeName: string | null;
  daysPerYear: number | null;
}

export interface LeaveType {
  id: number;
  name: string;
}

export interface Approver {
  id: string;
  name: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
}

export interface LeaveRequest {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  status: string | null;
  priority: string | null;
  reason: string | null;
  managerComment?: string | null;
  rejectionReason?: string | null;
  isHalfDay?: boolean;
  halfDayPeriod?: string | null;
  lopDays?: string | number | null;
  createdAt?: string | Date | null;
  leaveType: { name: string } | null;
  approver?: { name: string | null } | null;
  user?: {
    id?: string;
    role?: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image?: string | null;
  } | null;
}

export interface ApprovedLeave {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  user: {
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
  leaveType: { name: string } | null;
}

export interface WfhRequest {
  id: number;
  date: string;
  reason: string | null;
  status: string | null;
  rejectionReason?: string | null;
  createdAt: string | Date | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

/** Icon per leave type, for scanning a list of requests. No colour: A43's
 *  "sick leave is a different colour here" came from per-type palettes. */
const LEAVE_TYPE_ICONS: Record<string, LucideIcon> = {
  "Casual Leave": CalendarDays,
  "Sick Leave": Heart,
  "Unpaid Leave": Palmtree,
};

function leaveTypeIcon(typeName: string): LucideIcon {
  return LEAVE_TYPE_ICONS[typeName] ?? CalendarDays;
}

export function formatLeaveBalanceDisplay(balance: string | number): string {
  const n = typeof balance === "string" ? parseFloat(balance) || 0 : balance;
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return String(Math.round(rounded));
  return rounded.toFixed(1);
}

/** Leave/WFH status → tone (§5.3 semantic mapping). */
export function leaveStatusTone(status: string): Tone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "CANCELLED":
      return "neutral";
    default:
      return "danger";
  }
}

function LeaveStatusPill({ status }: { status: string }) {
  return (
    <StatusPill tone={leaveStatusTone(status)} dot>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </StatusPill>
  );
}

export const statusIconMap: Record<string, React.ElementType> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

export const priorityConfig: Record<string, { label: string; dotColor: string; textColor: string }> = {
  HIGH: { label: "High", dotColor: "bg-danger-500", textColor: "text-danger-strong" },
  MEDIUM: { label: "Medium", dotColor: "bg-warning-500", textColor: "text-warning-strong" },
  LOW: { label: "Low", dotColor: "bg-success-500", textColor: "text-success-strong" },
};

export const WfhRequestItem = React.memo(function WfhRequestItem({
  request,
  showUser = false,
  actions,
}: {
  request: WfhRequest;
  showUser?: boolean;
  actions?: React.ReactNode;
}) {
  const status = request.status || "PENDING";
  const StatusIcon = statusIconMap[status] ?? Clock;
  const showStatusBadge = !actions || status !== "PENDING";
  const employeeName = formatUserDisplayName(request.user);

  return (
    <div
      className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-border-strong"
      role="listitem"
    >
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showUser && request.user && (
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={resolveImageUrl(request.user.image)} alt="" />
              <AvatarFallback className="text-xs bg-brand-soft text-brand-soft-foreground">
                {request.user.firstName?.[0]}
                {request.user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            {showUser && request.user && (
              <p className="text-sm font-medium text-foreground truncate" title={employeeName}>
                {employeeName}
              </p>
            )}
            <p className={`tabular-nums ${showUser ? "mt-0.5 text-xs text-muted-foreground" : "text-sm text-foreground"}`}>
              {format(new Date(request.date), "EEEE, MMM dd, yyyy")}
            </p>
            {request.reason && (
              <p
                className="text-xs text-foreground/80 mt-0.5 line-clamp-3 max-w-full break-words [overflow-wrap:anywhere]"
                title={request.reason}
              >
                {request.reason}
              </p>
            )}
            {status === "REJECTED" && request.rejectionReason && (
              <p className="text-xs text-danger-strong mt-0.5 line-clamp-2 max-w-full break-words [overflow-wrap:anywhere]">
                Reason: {request.rejectionReason}
              </p>
            )}
          </div>
        </div>
        {(showStatusBadge || actions) && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-3">
            {showStatusBadge && (
              <StatusPill tone={leaveStatusTone(status)} className="gap-1">
                <StatusIcon className="size-3" aria-hidden="true" />
                {status}
              </StatusPill>
            )}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

export const StatsCard = React.memo(function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card role="listitem">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className={`flex size-9 items-center justify-center rounded-full ${accent}`}>
            <Icon className="size-4" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

function formatEmployeeName(request: LeaveRequest): string {
  return formatUserDisplayName(request.user);
}

export function formatUserDisplayName(
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null | undefined,
): string {
  if (!user) return "Unknown";
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || user.email || "Unknown";
}

export const RequestHistoryRow = React.memo(function RequestHistoryRow({
  request,
  isAdmin = false,
  isSelf = false,
  showEmployee = false,
  canManage = true,
  onApprove,
  onReject,
  onRevert,
  onCancel,
  onViewDetails,
  onRequestReject,
}: {
  request: LeaveRequest;
  isAdmin?: boolean;
  isSelf?: boolean;
  showEmployee?: boolean;
  canManage?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number, reason?: string) => void;
  onRevert?: (id: number) => void;
  onCancel?: (id: number) => void;
  onViewDetails?: () => void;
  onRequestReject?: () => void;
}) {
  const status = request.status ?? "PENDING";
  const typeName = request.leaveType?.name ?? "Leave";
  const Icon = leaveTypeIcon(typeName);
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const days = request.isHalfDay ? 0.5 : differenceInCalendarDays(end, start) + 1;
  const createdAt = request.createdAt ? new Date(request.createdAt) : start;

  const periodStr = request.isHalfDay
    ? `${format(start, "MMM d")} (${request.halfDayPeriod === "AM" ? "Morning" : "Afternoon"})`
    : days === 1
    ? format(start, "MMM d")
    : `${format(start, "MMM d")} - ${format(end, "MMM d")}`;


  const priority = request.priority || "MEDIUM";
  const pConfig = priorityConfig[priority] ?? priorityConfig.MEDIUM;

  const employeeName = formatEmployeeName(request);

  return (
    <tr className="group border-b border-border transition-colors last:border-0 hover:bg-muted/40">
      {showEmployee && (
        <td className="py-3.5 px-3">
          <div className="flex items-center gap-2.5 min-w-[140px]">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={resolveImageUrl(request.user?.image)} alt="" />
              <AvatarFallback className="text-2xs bg-brand-soft text-brand-soft-foreground">
                {request.user?.firstName?.[0]}
                {request.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground truncate" title={employeeName}>
              {employeeName}
            </span>
          </div>
        </td>
      )}
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-2.5">
          <IconChip icon={Icon} tone={leaveStatusTone(status)} size="sm" className="size-8" />
          <span className="text-sm font-medium text-foreground">{typeName.replace(" Leave", "")}<br /><span className="font-normal text-muted-foreground">Leave</span></span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-sm tabular-nums text-muted-foreground">
        {format(createdAt, "MMM d, yyyy")}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-sm tabular-nums text-muted-foreground">
        {periodStr}
      </td>
      <td className="px-3 py-3.5 text-center text-sm tabular-nums text-foreground">
        {request.isHalfDay ? (
          <span className="text-xs font-medium text-muted-foreground">
            {request.halfDayPeriod === "AM" ? "Morning" : "Afternoon"}
          </span>
        ) : (
          days
        )}
      </td>
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${pConfig.dotColor}`} aria-hidden="true" />
          <span className={`text-xs font-medium ${pConfig.textColor}`}>
            {pConfig.label}
          </span>
        </div>
      </td>
      <td className="py-3.5 px-3">
        <div className="flex flex-col gap-0.5">
          <div>
            <LeaveStatusPill status={status} />
          </div>
          {request.managerComment && (
            <span className="text-xs text-muted-foreground max-w-36 truncate" title={request.managerComment}>
              &ldquo;{request.managerComment}&rdquo;
            </span>
          )}
          {status === "REJECTED" && request.rejectionReason && (
            <span className="text-xs text-danger-strong max-w-36 truncate" title={request.rejectionReason}>
              {request.rejectionReason}
            </span>
          )}
        </div>
      </td>
      <td className="py-3.5 px-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Actions">
              <MoreVertical className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {isSelf && status === "PENDING" && onCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onCancel(request.id)}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel Request
                </DropdownMenuItem>
              </>
            )}
            {isAdmin && canManage && (
              <>
                <DropdownMenuSeparator />
                {status !== "APPROVED" && status !== "CANCELLED" && (
                  <DropdownMenuItem
                    onClick={() => onApprove?.(request.id)}
                    className="text-success-strong"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                )}
                {status !== "REJECTED" && status !== "CANCELLED" && (
                  <DropdownMenuItem
                    onClick={onRequestReject}
                    className="text-danger-strong"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                )}
                {(status === "APPROVED" || status === "REJECTED") && (
                  <DropdownMenuItem
                    onClick={() => onRevert?.(request.id)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Revert to Pending
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

export function LeaveRequestDetailsSheet({
  request,
  showEmployee = false,
  open,
  onOpenChange,
}: {
  request: LeaveRequest | null;
  showEmployee?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!request) return null;

  const status = request.status ?? "PENDING";
  const typeName = request.leaveType?.name ?? "Leave";
  const Icon = leaveTypeIcon(typeName);
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const days = request.isHalfDay ? 0.5 : differenceInCalendarDays(end, start) + 1;
  const createdAt = request.createdAt ? new Date(request.createdAt) : start;
  const periodStr = request.isHalfDay
    ? `${format(start, "MMM d")} (${request.halfDayPeriod === "AM" ? "Morning" : "Afternoon"})`
    : days === 1
    ? format(start, "MMM d")
    : `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
  const priority = request.priority || "MEDIUM";
  const pConfig = priorityConfig[priority] ?? priorityConfig.MEDIUM;
  const employeeName = formatEmployeeName(request);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="sm" className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-6 pb-4 pt-5">
          <SheetTitle className="font-display text-lg font-bold">Leave Request Details</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm">
          {showEmployee && request.user && (
            <div className="flex items-center gap-3 pb-1">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={resolveImageUrl(request.user.image)} alt="" />
                <AvatarFallback className="text-xs bg-brand-soft text-brand-soft-foreground">
                  {request.user.firstName?.[0]}
                  {request.user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{employeeName}</p>
                {request.user.email && (
                  <p className="text-xs text-muted-foreground truncate">{request.user.email}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <IconChip icon={Icon} tone={leaveStatusTone(status)} />
            <div>
              <p className="font-semibold text-foreground">{typeName}</p>
              <div className="mt-1">
                <LeaveStatusPill status={status} />
              </div>
            </div>
          </div>

          <PropertyList
            className="rounded-lg border border-border bg-surface-sunken p-3 tabular-nums"
            items={[
              { label: "Submitted", value: format(createdAt, "MMM d, yyyy") },
              { label: "Period", value: periodStr },
              {
                label: "Duration",
                value: request.isHalfDay
                  ? `0.5 day (${request.halfDayPeriod === "AM" ? "Morning" : "Afternoon"})`
                  : `${days} day${days !== 1 ? "s" : ""}`,
              },
              {
                label: "Priority",
                value: (
                  <span className={`inline-flex items-center gap-1.5 font-medium ${pConfig.textColor}`}>
                    <span className={`size-2 rounded-full ${pConfig.dotColor}`} aria-hidden="true" />
                    {pConfig.label}
                  </span>
                ),
              },
            ]}
          />

          {request.reason && (
            <div className="space-y-1">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</p>
              <p className="max-w-full break-words rounded-lg bg-surface-sunken p-3 text-sm text-foreground [overflow-wrap:anywhere]">
                {request.reason}
              </p>
            </div>
          )}

          {request.approver?.name && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {status === "APPROVED" ? "Approved by" : "Processed by"}
              </span>
              <span className="font-medium">{request.approver.name}</span>
            </div>
          )}

          {status === "REJECTED" && request.rejectionReason && (
            <div className="space-y-1">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Rejection Reason</p>
              <p className="max-w-full break-words rounded-lg bg-danger-soft p-3 text-sm text-danger-strong [overflow-wrap:anywhere]">
                {request.rejectionReason}
              </p>
            </div>
          )}

          {request.managerComment && (
            <div className="space-y-1">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Manager Comment</p>
              <p className="max-w-full break-words rounded-lg bg-surface-sunken p-3 text-sm text-foreground [overflow-wrap:anywhere]">
                {request.managerComment}
              </p>
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function LeaveRequestRejectSheet({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}) {
  const [rejectReason, setRejectReason] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setRejectReason("");
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-border px-6 pb-4 pt-5">
          <SheetTitle className="font-display text-lg font-bold">Rejection reason</SheetTitle>
        </SheetHeader>
        <div className="flex-1 px-6 py-5">
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-20"
            aria-label="Rejection reason"
          />
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            loading={isPending}
            onClick={() => {
              onConfirm(rejectReason);
              setRejectReason("");
            }}
          >
            Reject
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function LeaveRequestTable({
  requests,
  isAdmin = false,
  isSelf = false,
  showEmployee = false,
  canManage,
  caption = "Leave request history",
  minWidth = "600px",
  onApprove,
  onReject,
  onRevert,
  onCancel,
}: {
  requests: LeaveRequest[];
  isAdmin?: boolean;
  isSelf?: boolean;
  showEmployee?: boolean;
  canManage?: (request: LeaveRequest) => boolean;
  caption?: string;
  minWidth?: string;
  onApprove?: (id: number) => void;
  onReject?: (id: number, reason?: string) => void;
  onRevert?: (id: number) => void;
  onCancel?: (id: number) => void;
}) {
  const [detailsRequest, setDetailsRequest] = useState<LeaveRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<LeaveRequest | null>(null);

  const handleRejectConfirm = (reason: string) => {
    if (!rejectRequest) return;
    onReject?.(rejectRequest.id, reason || undefined);
    setRejectRequest(null);
  };

  return (
    <>
      <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border bg-card">
        <div style={{ minWidth }}>
          <table className="w-full">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                {showEmployee && (
                  <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Employee</th>
                )}
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Date Requested</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Period</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Days</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</th>
                <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <RequestHistoryRow
                  key={req.id}
                  request={req}
                  isAdmin={isAdmin}
                  isSelf={isSelf}
                  showEmployee={showEmployee}
                  canManage={canManage ? canManage(req) : true}
                  onApprove={onApprove}
                  onReject={onReject}
                  onRevert={onRevert}
                  onCancel={onCancel}
                  onViewDetails={() => setDetailsRequest(req)}
                  onRequestReject={() => setRejectRequest(req)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LeaveRequestDetailsSheet
        request={detailsRequest}
        showEmployee={showEmployee}
        open={detailsRequest !== null}
        onOpenChange={(open) => { if (!open) setDetailsRequest(null); }}
      />
      <LeaveRequestRejectSheet
        open={rejectRequest !== null}
        onOpenChange={(open) => { if (!open) setRejectRequest(null); }}
        onConfirm={handleRejectConfirm}
      />
    </>
  );
}
