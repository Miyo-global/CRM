"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { LeaveBalanceRow } from "@/components/dashboard/widgets/leave-balance-widget";
import { resolveImageUrl } from "@/lib/utils";
import { toneBar } from "@/lib/design/tones";
import { format } from "date-fns";
import { CalendarOff, CalendarClock, TreePalm, Clock, Cake, Award, AlertCircle, Users, UserCheck, UserX } from "lucide-react";
import {
  useLeavesToday, useUpcomingLeaves, useUpcomingHolidays,
  useMyLeaveBalance, usePendingRequests, useBirthdays,
  usePendingApprovals, useTeamAttendance,
  type LeaveToday, type UpcomingLeave, type UpcomingHoliday,
  type LeaveBalance, type PendingRequest, type BirthdayEntry,
} from "@/lib/api/hooks/dashboard";

const MAX_ROWS = 6;

function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-11 items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyWidget({ message }: { message: string }) {
  return (
    <p className="rounded-md bg-surface-sunken/40 py-6 text-center text-xs text-muted-foreground">{message}</p>
  );
}

function PersonAvatar({ src, name }: { src?: string | null; name?: string | null }) {
  return (
    <Avatar className="size-8">
      <AvatarImage src={resolveImageUrl(src)} alt={name ?? ""} />
      <AvatarFallback className="text-2xs">{name?.[0]}</AvatarFallback>
    </Avatar>
  );
}

export function LeavesTodayWidget() {
  const { data, isLoading } = useLeavesToday();
  return (
    <WidgetCard title="Who's On Leave Today" icon={CalendarOff} tone="warning" count={data?.length || undefined}>
      {isLoading ? <WidgetSkeleton /> : !data?.length ? <EmptyWidget message="Everyone is in today!" /> : (
        <ul className="-mx-2">
          {data.slice(0, MAX_ROWS).map((l: LeaveToday) => (
            <li key={l.id}>
              <WidgetListRow
                leading={<PersonAvatar src={l.employeeImage} name={l.employeeName} />}
                title={l.employeeName}
                meta={<span className="tabular-nums">Leave · back {format(new Date(l.endDate), "MMM d")}</span>}
              />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function UpcomingLeavesWidget() {
  const { data, isLoading } = useUpcomingLeaves();
  return (
    <WidgetCard title="Upcoming Leaves" icon={CalendarClock} tone="info">
      {isLoading ? <WidgetSkeleton /> : !data?.length ? <EmptyWidget message="No upcoming leaves this week." /> : (
        <ul className="-mx-2">
          {data.slice(0, MAX_ROWS).map((l: UpcomingLeave) => (
            <li key={l.id}>
              <WidgetListRow
                leading={<PersonAvatar src={l.userImage} name={l.userName} />}
                title={l.userName}
                meta={
                  <span className="tabular-nums">
                    {l.leaveType} · {format(new Date(l.startDate), "MMM d")} – {format(new Date(l.endDate), "MMM d")}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function UpcomingHolidaysWidget() {
  const { data, isLoading } = useUpcomingHolidays();
  return (
    <WidgetCard title="Upcoming Holidays" icon={TreePalm} tone="success">
      {isLoading ? <WidgetSkeleton rows={2} /> : !data?.length ? <EmptyWidget message="No upcoming holidays." /> : (
        <ul className="-mx-2">
          {data.slice(0, MAX_ROWS).map((h: UpcomingHoliday) => (
            <li key={h.id}>
              <WidgetListRow
                title={h.name}
                meta={<span className="tabular-nums">{format(new Date(h.date), "EEEE, MMM d")}</span>}
              />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function LeaveBalanceWidget() {
  const { data, isLoading } = useMyLeaveBalance();
  return (
    <WidgetCard title="My Leave Balance" icon={Clock} tone="plum">
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="mx-auto size-14 rounded-full" />)}
        </div>
      ) : !data?.length ? <EmptyWidget message="No leave balances found." /> : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
          {data.slice(0, MAX_ROWS).map((b: LeaveBalance) => (
            <li key={b.id} className="min-w-0">
              <LeaveBalanceRow value={Number(b.balance) || 0} total={b.daysPerYear ?? 0} label={b.leaveTypeName ?? ""} />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function PendingRequestsWidget() {
  const { data, isLoading } = usePendingRequests();
  return (
    <WidgetCard title="My Pending Requests" icon={Clock} tone="warning" count={data?.length || undefined}>
      {isLoading ? <WidgetSkeleton rows={2} /> : !data?.length ? <EmptyWidget message="No pending requests." /> : (
        <ul className="-mx-2">
          {data.slice(0, MAX_ROWS).map((r: PendingRequest) => (
            <li key={r.id}>
              <WidgetListRow
                title={r.leaveTypeName ?? "Leave"}
                meta={
                  <span className="tabular-nums">
                    {format(new Date(r.startDate), "MMM d")} – {format(new Date(r.endDate), "MMM d")}
                  </span>
                }
                trailing={<StatusPill tone="warning" dot>Pending</StatusPill>}
              />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function BirthdaysWidget() {
  const { data, isLoading } = useBirthdays();
  return (
    <WidgetCard title="Birthdays & Anniversaries" icon={Cake} tone="plum">
      {isLoading ? <WidgetSkeleton /> : !data?.length ? <EmptyWidget message="No celebrations this week." /> : (
        <ul className="-mx-2">
          {data.slice(0, MAX_ROWS).map((b: BirthdayEntry) => (
            <li key={b.id}>
              <WidgetListRow
                leading={<PersonAvatar src={b.image} name={b.name} />}
                title={b.name}
                meta={
                  b.type === "birthday" ? (
                    <span className="inline-flex items-center gap-1">
                      <Cake className="size-3" aria-hidden="true" /> Birthday {b.date ? format(new Date(b.date), "MMM d") : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Award className="size-3" aria-hidden="true" /> {b.yearsCompleted}yr anniversary
                    </span>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function PendingApprovalsWidget() {
  const { data, isLoading } = usePendingApprovals();
  return (
    <WidgetCard title="Pending Approvals" icon={AlertCircle} tone="danger" count={data?.total || undefined}>
      {isLoading ? <WidgetSkeleton rows={2} /> : !data ? <EmptyWidget message="No data." /> : (
        <dl className="divide-y divide-border">
          <div className="flex h-11 items-center justify-between">
            <dt className="text-sm text-muted-foreground">Leave Requests</dt>
            <dd className="text-sm font-semibold tabular-nums">{data.pendingLeaves}</dd>
          </div>
          <div className="flex h-11 items-center justify-between">
            <dt className="text-sm text-muted-foreground">Resignations</dt>
            <dd className="text-sm font-semibold tabular-nums">{data.pendingResignations}</dd>
          </div>
        </dl>
      )}
    </WidgetCard>
  );
}

export function TeamAttendanceWidget() {
  const { data, isLoading } = useTeamAttendance();
  const rate = data?.total ? Math.round((data.present / data.total) * 100) : 0;
  return (
    <WidgetCard title="Team Attendance" icon={Users} tone="info">
      {isLoading ? <WidgetSkeleton rows={2} /> : !data ? <EmptyWidget message="No data." /> : (
        <div>
          <dl className="mb-3 grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Present", value: data.present, icon: UserCheck, tone: "success" as const },
              { label: "Absent", value: data.absent, icon: UserX, tone: "danger" as const },
              { label: "On leave", value: data.onLeave, icon: CalendarOff, tone: "warning" as const },
              { label: "Total", value: data.total, icon: Users, tone: "neutral" as const },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 rounded-md bg-surface-sunken/40 py-2">
                <dt className="order-last text-2xs text-muted-foreground">{s.label}</dt>
                <dd className="font-display text-lg font-bold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${toneBar.success}`}
              style={{ width: `${data.total ? (data.present / data.total) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-center text-2xs tabular-nums text-muted-foreground">{rate}% attendance rate</p>
        </div>
      )}
    </WidgetCard>
  );
}
