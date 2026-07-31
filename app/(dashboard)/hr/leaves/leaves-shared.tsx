"use client";

import React, { useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Info,
  MoreVertical,
  Eye,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import { resolveImageUrl } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { getColorSafe, wfhStatusColors } from "@/lib/theme-constants";

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

export const balanceCardConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "Casual Leave": { label: "CASUAL", color: "bg-gold", icon: CalendarDays },
  "Sick Leave": { label: "SICK", color: "bg-red-400", icon: Heart },
  "Unpaid Leave": { label: "UNPAID", color: "bg-slate-400", icon: Palmtree },
};

export const DEFAULT_CARD_CONFIG = { label: "LEAVE", color: "bg-slate-400", icon: CalendarDays };

export function formatLeaveBalanceDisplay(balance: string | number): string {
  const n = typeof balance === "string" ? parseFloat(balance) || 0 : balance;
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return String(Math.round(rounded));
  return rounded.toFixed(1);
}

export const statusIconMap: Record<string, React.ElementType> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

export const priorityConfig: Record<string, { label: string; dotColor: string; textColor: string }> = {
  HIGH: { label: "High", dotColor: "bg-red-500", textColor: "text-red-600 dark:text-red-400" },
  MEDIUM: { label: "Medium", dotColor: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
  LOW: { label: "Low", dotColor: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
};

export const BalanceCard = React.memo(function BalanceCard({
  typeName,
  balance,
  daysPerYear,
}: {
  typeName: string | null;
  balance: string;
  daysPerYear: number | null;
}) {
  const name = typeName ?? "Leave";
  const config = balanceCardConfig[name] ?? DEFAULT_CARD_CONFIG;
  const balanceNum = parseFloat(balance) || 0;
  const balanceLabel = formatLeaveBalanceDisplay(balance);
  const total = daysPerYear ?? 0;
  const pct = total > 0 ? Math.min((balanceNum / total) * 100, 100) : 0;
  const isUnpaid = name.toLowerCase().includes("unpaid");

  return (
    <Card className="border-border" role="listitem">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {config.label}
          </span>
          <button className="text-muted-foreground hover:text-foreground" aria-label={`Info about ${name}`}>
            <Info className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1">
          <span className="text-3xl font-bold text-foreground">{balanceLabel}</span>
          {total > 0 && (
            <span className="text-lg text-muted-foreground ml-1">/ {total}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {isUnpaid ? "Days Taken" : "Days Available"}
        </p>

        <div
          className="h-1.5 bg-muted rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={balanceNum}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${name} balance`}
          aria-valuetext={`${balanceLabel} of ${total} days available`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${config.color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
});

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
      className="rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors min-w-0 max-w-full overflow-hidden"
      role="listitem"
    >
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showUser && request.user && (
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={resolveImageUrl(request.user.image)} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
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
            <p className={`text-xs text-muted-foreground ${showUser ? "mt-0.5" : "text-sm text-foreground"}`}>
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
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 line-clamp-2 max-w-full break-words [overflow-wrap:anywhere]">
                Reason: {request.rejectionReason}
              </p>
            )}
          </div>
        </div>
        {(showStatusBadge || actions) && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-3">
            {showStatusBadge && (
              <Badge
                variant="outline"
                className={`text-xs flex items-center gap-1 ${getColorSafe(wfhStatusColors, status)}`}
              >
                <StatusIcon className="h-3 w-3" aria-hidden="true" />
                {status}
              </Badge>
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
    <Card className="border-border" role="listitem">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
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
  const config = balanceCardConfig[typeName] ?? DEFAULT_CARD_CONFIG;
  const Icon = config.icon;
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const days = request.isHalfDay ? 0.5 : differenceInCalendarDays(end, start) + 1;
  const createdAt = request.createdAt ? new Date(request.createdAt) : start;

  const periodStr = request.isHalfDay
    ? `${format(start, "MMM d")} (${request.halfDayPeriod === "AM" ? "Morning" : "Afternoon"})`
    : days === 1
    ? format(start, "MMM d")
    : `${format(start, "MMM d")} - ${format(end, "MMM d")}`;

  const statusDotColor =
    status === "PENDING"
      ? "bg-amber-500"
      : status === "APPROVED"
      ? "bg-emerald-500"
      : status === "CANCELLED"
      ? "bg-slate-400"
      : "bg-red-500";

  const priority = request.priority || "MEDIUM";
  const pConfig = priorityConfig[priority] ?? priorityConfig.MEDIUM;

  const employeeName = formatEmployeeName(request);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {showEmployee && (
        <td className="py-3.5 px-3">
          <div className="flex items-center gap-2.5 min-w-[140px]">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={resolveImageUrl(request.user?.image)} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
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
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            status === "PENDING" ? "bg-amber-500/10" : status === "APPROVED" ? "bg-emerald-500/10" : "bg-red-500/10"
          }`}>
            <Icon className={`h-4 w-4 ${
              status === "PENDING" ? "text-amber-600" : status === "APPROVED" ? "text-emerald-600" : "text-red-600"
            }`} aria-hidden="true" />
          </div>
          <span className="text-sm font-medium text-foreground">{typeName.replace(" Leave", "")}<br /><span className="font-normal text-muted-foreground">Leave</span></span>
        </div>
      </td>
      <td className="py-3.5 px-3 text-sm text-muted-foreground">
        {format(createdAt, "MMM d, yyyy")}
      </td>
      <td className="py-3.5 px-3 text-sm text-muted-foreground">
        {periodStr}
      </td>
      <td className="py-3.5 px-3 text-sm text-foreground text-center">
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
          <span className={`h-2 w-2 rounded-full ${pConfig.dotColor}`} />
          <span className={`text-xs font-medium ${pConfig.textColor}`}>
            {pConfig.label}
          </span>
        </div>
      </td>
      <td className="py-3.5 px-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusDotColor}`} />
            <span className={`text-xs font-medium ${
              status === "PENDING"
                ? "text-amber-600 dark:text-amber-400"
                : status === "APPROVED"
                ? "text-emerald-600 dark:text-emerald-400"
                : status === "CANCELLED"
                ? "text-slate-500 dark:text-slate-400"
                : "text-red-600 dark:text-red-400"
            }`}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          </div>
          {request.managerComment && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={request.managerComment}>
              &ldquo;{request.managerComment}&rdquo;
            </span>
          )}
          {status === "REJECTED" && request.rejectionReason && (
            <span className="text-xs text-red-500 dark:text-red-400 truncate max-w-[140px]" title={request.rejectionReason}>
              {request.rejectionReason}
            </span>
          )}
        </div>
      </td>
      <td className="py-3.5 px-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Actions">
              <MoreVertical className="h-4 w-4" />
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
                  className="text-slate-600"
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
                    className="text-emerald-600"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                )}
                {status !== "REJECTED" && status !== "CANCELLED" && (
                  <DropdownMenuItem
                    onClick={onRequestReject}
                    className="text-red-600"
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
  const config = balanceCardConfig[typeName] ?? DEFAULT_CARD_CONFIG;
  const Icon = config.icon;
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const days = request.isHalfDay ? 0.5 : differenceInCalendarDays(end, start) + 1;
  const createdAt = request.createdAt ? new Date(request.createdAt) : start;
  const periodStr = request.isHalfDay
    ? `${format(start, "MMM d")} (${request.halfDayPeriod === "AM" ? "Morning" : "Afternoon"})`
    : days === 1
    ? format(start, "MMM d")
    : `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
  const statusDotColor =
    status === "PENDING"
      ? "bg-amber-500"
      : status === "APPROVED"
      ? "bg-emerald-500"
      : status === "CANCELLED"
      ? "bg-slate-400"
      : "bg-red-500";
  const priority = request.priority || "MEDIUM";
  const pConfig = priorityConfig[priority] ?? priorityConfig.MEDIUM;
  const employeeName = formatEmployeeName(request);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="p-5 pb-4 border-b">
          <SheetTitle className="text-base">Leave Request Details</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {showEmployee && request.user && (
            <div className="flex items-center gap-3 pb-1">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={resolveImageUrl(request.user.image)} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
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
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              status === "PENDING" ? "bg-amber-500/10" : status === "APPROVED" ? "bg-emerald-500/10" : "bg-red-500/10"
            }`}>
              <Icon className={`h-5 w-5 ${
                status === "PENDING" ? "text-amber-600" : status === "APPROVED" ? "text-emerald-600" : "text-red-600"
              }`} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{typeName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${statusDotColor}`} />
                <span className={`text-xs ${
                  status === "PENDING" ? "text-amber-600" : status === "APPROVED" ? "text-emerald-600" : status === "CANCELLED" ? "text-slate-500" : "text-red-600"
                }`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Submitted</span>
              <span className="font-medium text-xs">{format(createdAt, "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Period</span>
              <span className="font-medium text-xs">{periodStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Duration</span>
              <span className="font-medium text-xs">
                {request.isHalfDay ? `0.5 day (${request.halfDayPeriod === "AM" ? "Morning" : "Afternoon"})` : `${days} day${days !== 1 ? "s" : ""}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Priority</span>
              <span className={`text-xs font-medium ${pConfig.textColor}`}>{pConfig.label}</span>
            </div>
          </div>

          {request.reason && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</p>
              <p className="max-w-full break-words rounded-lg bg-muted/30 p-3 text-sm text-foreground [overflow-wrap:anywhere]">
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rejection Reason</p>
              <p className="max-w-full break-words rounded-lg bg-red-500/5 p-3 text-sm text-red-600 [overflow-wrap:anywhere] dark:text-red-400">
                {request.rejectionReason}
              </p>
            </div>
          )}

          {request.managerComment && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Manager Comment</p>
              <p className="max-w-full break-words rounded-lg bg-muted/30 p-3 text-sm text-foreground [overflow-wrap:anywhere]">
                {request.managerComment}
              </p>
            </div>
          )}
        </div>
        <div className="p-5 pt-4 border-t">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
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
      <SheetContent className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Rejection reason</SheetTitle>
        </SheetHeader>
        <Textarea
          placeholder="Reason (optional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="min-h-[80px]"
        />
        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={isPending}
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
      <div className="w-full max-w-full overflow-x-auto rounded-md border border-border">
        <div style={{ minWidth }}>
          <table className="w-full">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {showEmployee && (
                  <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Employee</th>
                )}
                <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Date Requested</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Period</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Days</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Priority</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-2.5 px-3">Action</th>
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
