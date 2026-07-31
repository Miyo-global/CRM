"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import {
  CalendarOff, CalendarClock, CalendarHeart, TreePalm,
  Clock, Cake, Award, AlertCircle, Users, UserCheck, UserX,
} from "lucide-react";
import {
  useLeavesToday, useUpcomingLeaves, useUpcomingHolidays,
  useMyLeaveBalance, usePendingRequests, useBirthdays,
  usePendingApprovals, useTeamAttendance,
  type LeaveToday, type UpcomingLeave, type UpcomingHoliday,
  type LeaveBalance, type PendingRequest, type BirthdayEntry,
} from "@/lib/api/hooks/dashboard";

function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
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
    <p className="text-xs text-muted-foreground text-center py-6">{message}</p>
  );
}

export function LeavesTodayWidget() {
  const { data, isLoading } = useLeavesToday();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarOff className="h-4 w-4 text-orange-500" />
          Who&apos;s On Leave Today
          {data?.length ? <Badge variant="secondary" className="ml-auto text-[10px]">{data.length}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? <WidgetSkeleton /> : !data?.length ? <EmptyWidget message="Everyone is in today!" /> : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto">
            {data.map((l: LeaveToday) => (
              <div key={l.id} className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={resolveImageUrl(l.employeeImage)} />
                  <AvatarFallback className="text-[10px] bg-primary/10">{l.employeeName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{l.employeeName}</p>
                  <p className="text-[10px] text-muted-foreground">Leave · back {format(new Date(l.endDate), "MMM d")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingLeavesWidget() {
  const { data, isLoading } = useUpcomingLeaves();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-blue-500" />
          Upcoming Leaves
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? <WidgetSkeleton /> : !data?.length ? <EmptyWidget message="No upcoming leaves this week." /> : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto">
            {data.map((l: UpcomingLeave) => (
              <div key={l.id} className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={resolveImageUrl(l.userImage)} />
                  <AvatarFallback className="text-[10px] bg-primary/10">{l.userName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{l.userName}</p>
                  <p className="text-[10px] text-muted-foreground">{l.leaveType} · {format(new Date(l.startDate), "MMM d")} – {format(new Date(l.endDate), "MMM d")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingHolidaysWidget() {
  const { data, isLoading } = useUpcomingHolidays();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TreePalm className="h-4 w-4 text-green-500" />
          Upcoming Holidays
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? <WidgetSkeleton rows={2} /> : !data?.length ? <EmptyWidget message="No upcoming holidays." /> : (
          <div className="space-y-2.5">
            {data.map((h: UpcomingHoliday) => (
              <div key={h.id} className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <CalendarHeart className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{h.name}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(h.date), "EEEE, MMM d")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LeaveBalanceWidget() {
  const { data, isLoading } = useMyLeaveBalance();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-500" />
          My Leave Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? <WidgetSkeleton rows={2} /> : !data?.length ? <EmptyWidget message="No leave balances found." /> : (
          <div className="grid grid-cols-2 gap-2">
            {data.map((b: LeaveBalance) => {
              const balance = Number(b.balance) || 0;
              const used = (b.daysPerYear ?? 0) - balance;
              const pct = b.daysPerYear ? (balance / b.daysPerYear) * 100 : 0;
              return (
                <div key={b.id} className="rounded-lg border p-2.5">
                  <p className="text-[10px] text-muted-foreground truncate">{b.leaveTypeName}</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold">{balance}</span>
                    <span className="text-[10px] text-muted-foreground">/ {b.daysPerYear}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PendingRequestsWidget() {
  const { data, isLoading } = usePendingRequests();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-500" />
          My Pending Requests
          {data?.length ? <Badge variant="outline" className="ml-auto text-[10px]">{data.length}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? <WidgetSkeleton rows={2} /> : !data?.length ? <EmptyWidget message="No pending requests." /> : (
          <div className="space-y-2">
            {data.map((r: PendingRequest) => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-md border text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{r.leaveTypeName ?? "Leave"}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(r.startDate), "MMM d")} – {format(new Date(r.endDate), "MMM d")}</p>
                </div>
                <Badge variant="outline" className="text-[10px] text-yellow-600">Pending</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BirthdaysWidget() {
  const { data, isLoading } = useBirthdays();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Cake className="h-4 w-4 text-pink-500" />
          Birthdays & Anniversaries
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? <WidgetSkeleton /> : !data?.length ? <EmptyWidget message="No celebrations this week." /> : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto">
            {data.map((b: BirthdayEntry) => (
              <div key={b.id} className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={resolveImageUrl(b.image)} />
                  <AvatarFallback className="text-[10px] bg-pink-500/10">{b.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{b.name}</p>
                  <div className="flex items-center gap-1.5">
                    {b.type === "birthday" && (
                      <span className="text-[10px] text-pink-600 flex items-center gap-0.5">
                        <Cake className="h-3 w-3" /> Birthday {b.date ? format(new Date(b.date), "MMM d") : ""}
                      </span>
                    )}
                    {b.type === "anniversary" && (
                      <span className="text-[10px] text-blue-600 flex items-center gap-0.5">
                        <Award className="h-3 w-3" /> {b.yearsCompleted}yr anniversary
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PendingApprovalsWidget() {
  const { data, isLoading } = usePendingApprovals();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          Pending Approvals
          {data?.total ? <Badge variant="destructive" className="ml-auto text-[10px]">{data.total}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? <WidgetSkeleton rows={2} /> : !data ? <EmptyWidget message="No data." /> : (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg border">
              <span className="text-xs text-muted-foreground">Leave Requests</span>
              <span className="text-sm font-bold">{data.pendingLeaves}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border">
              <span className="text-xs text-muted-foreground">Resignations</span>
              <span className="text-sm font-bold">{data.pendingResignations}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamAttendanceWidget() {
  const { data, isLoading } = useTeamAttendance();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" />
          Team Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? <WidgetSkeleton rows={2} /> : !data ? <EmptyWidget message="No data." /> : (
          <div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg border p-2 text-center">
                <UserCheck className="h-3.5 w-3.5 mx-auto text-green-500 mb-0.5" />
                <p className="text-lg font-bold">{data.present}</p>
                <p className="text-[10px] text-muted-foreground">Present</p>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <UserX className="h-3.5 w-3.5 mx-auto text-red-500 mb-0.5" />
                <p className="text-lg font-bold">{data.absent}</p>
                <p className="text-[10px] text-muted-foreground">Absent</p>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
                <p className="text-lg font-bold">{data.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${data.total ? (data.present / data.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              {data.total ? Math.round((data.present / data.total) * 100) : 0}% attendance rate
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
