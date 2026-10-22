"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
  useHrToggleBreak,
} from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Coffee, LogIn, LogOut, Play, Pause } from "lucide-react";
import { formatDuration, formatTimerSegment } from "./attendance-utils";
import { OvertimeWorklogSheet } from "./overtime-worklog-sheet";

export const TimerCard = memo(function TimerCard() {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [localCooldown, setLocalCooldown] = useState(0);
  const [otPrompt, setOtPrompt] = useState<{ date: string; hours?: number } | null>(null);

  const { data: statusData, isLoading } = useHrAttendanceStatus({ refetchInterval: 60000, staleTime: 30000 });

  const checkInMutation = useHrCheckIn({
    onSuccess: () => {
      toast.success("Clocked in successfully");
      setLocalCooldown(0);
    },
    onError: (err) => toast.error(err.message),
  });

  const checkOutMutation = useHrCheckOut({
    onSuccess: (data, variables) => {
      toast.success("Clocked out successfully");
      setLocalCooldown(120);
      if (data?.shouldLogOvertime) {
        setOtPrompt({
          date: data.date ?? variables.localDate ?? format(new Date(), "yyyy-MM-dd"),
          hours: data.totalWorkHours,
        });
      }
    },
    // Clock-out is refused until today's work log is saved; point straight at
    // it instead of leaving a bare error (V5-0010).
    onError: (err) =>
      toast.error(err.message, /work log/i.test(err.message)
        ? { action: { label: "Open work log", onClick: () => router.push("/hr/work-logs") } }
        : undefined),
  });

  const [localBreakOverride, setLocalBreakOverride] = useState<boolean | null>(null);

  const breakMutation = useHrToggleBreak({
    onSuccess: () => toast.success("Break toggled"),
    onError: () => {
      setLocalBreakOverride(null);
      toast.error("Failed to toggle break");
    },
  });

  useEffect(() => {
    if (statusData?.cooldownRemaining && statusData.cooldownRemaining > 0) {
      setLocalCooldown(statusData.cooldownRemaining);
    }
  }, [statusData?.cooldownRemaining]);

  useEffect(() => {
    if (localCooldown <= 0) return;
    const timer = setTimeout(() => setLocalCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [localCooldown]);

  useEffect(() => {
    if (statusData) setLocalBreakOverride(null);
  }, [statusData?.status]);

  const isInCooldown = localCooldown > 0;
  const isPending = checkInMutation.isPending || checkOutMutation.isPending;

  const hasActivePunch = Boolean(
    statusData?.todayLog?.checkIn && !statusData?.todayLog?.checkOut,
  );

  const isCheckedIn =
    hasActivePunch &&
    (statusData?.status === "PRESENT" ||
      (localBreakOverride === false && statusData?.status === "ON_BREAK"));
  const isOnBreak =
    hasActivePunch &&
    (localBreakOverride !== null ? localBreakOverride : statusData?.status === "ON_BREAK");
  const isActive = hasActivePunch;

  const breakStartRef = useRef<number | null>(null);
  const [localExtraBreakMs, setLocalExtraBreakMs] = useState(0);
  const prevBreakHoursRef = useRef<number>(0);

  useEffect(() => {
    if (isOnBreak && !breakStartRef.current) {
      breakStartRef.current = Date.now();
    } else if (!isOnBreak && breakStartRef.current !== null) {
      const duration = Date.now() - breakStartRef.current;
      setLocalExtraBreakMs((prev) => prev + duration);
      breakStartRef.current = null;
    }
  }, [isOnBreak]);

  useEffect(() => {
    const serverBreakHours = Number(statusData?.todayLog?.breakHours) || 0;
    if (serverBreakHours > prevBreakHoursRef.current) {
      setLocalExtraBreakMs(0);
      prevBreakHoursRef.current = serverBreakHours;
    }
  }, [statusData?.todayLog?.breakHours]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sessionTimer = useMemo(() => {
    if (!statusData?.todayLog?.checkIn || statusData?.todayLog?.checkOut) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    const checkInTime = new Date(statusData.todayLog.checkIn);
    const serverBreakMs = (Number(statusData.todayLog.breakHours) || 0) * 3600000;
    const totalBreakMs = serverBreakMs + localExtraBreakMs;
    const currentBreakMs = isOnBreak && breakStartRef.current ? now.getTime() - breakStartRef.current : 0;
    const allBreakMs = totalBreakMs + currentBreakMs;
    const diffMs = Math.max(0, now.getTime() - checkInTime.getTime() - allBreakMs);
    return {
      hours: Math.floor(diffMs / 3600000),
      minutes: Math.floor((diffMs % 3600000) / 60000),
      seconds: Math.floor((diffMs % 60000) / 1000),
    };
  }, [now, statusData?.todayLog, localExtraBreakMs, isOnBreak]);

  const handleCheckIn = useCallback(() => {
    checkInMutation.mutate({ location: undefined, localDate: format(new Date(), "yyyy-MM-dd") });
  }, [checkInMutation]);

  const handleClockAction = useCallback(() => {
    const localDate = format(new Date(), "yyyy-MM-dd");
    if (isActive) {
      checkOutMutation.mutate({ localDate });
    } else if (!isInCooldown) {
      checkInMutation.mutate({ location: undefined, localDate });
    }
  }, [isActive, isInCooldown, checkInMutation, checkOutMutation]);

  const handleBreakToggle = useCallback(() => {
    const goingOnBreak = !isOnBreak;
    setLocalBreakOverride(goingOnBreak);
    if (goingOnBreak) {
      breakStartRef.current = Date.now();
    }
    breakMutation.mutate();
  }, [breakMutation, isOnBreak]);

  const dailyStats = statusData?.dailyStats;
  const checkInTime = statusData?.todayLog?.checkIn;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-64" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          Time Tracker
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span
              className={`size-2 rounded-full ${isActive ? (isOnBreak ? "bg-warning-500" : "bg-success-500 motion-safe:animate-pulse") : "bg-ink-300"}`}
              aria-hidden="true"
            />
            <span className="sr-only">{isActive ? (isOnBreak ? "On break" : "Clocked in") : "Not clocked in"}</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pb-5">
        <div
          className="flex items-center justify-center gap-2"
          aria-label={`Session time: ${sessionTimer.hours} hours, ${sessionTimer.minutes} minutes, ${sessionTimer.seconds} seconds`}
        >
          <div className="flex flex-col items-center">
            <div className="min-w-14 rounded-lg bg-surface-sunken px-3 py-3 text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.hours)}
              </span>
            </div>
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              HRS
            </span>
          </div>

          <span className="mb-5 text-2xl font-bold text-brand-text motion-safe:animate-pulse" aria-hidden="true">:</span>

          <div className="flex flex-col items-center">
            <div className="min-w-14 rounded-lg bg-surface-sunken px-3 py-3 text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.minutes)}
              </span>
            </div>
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              MIN
            </span>
          </div>

          <span className="mb-5 text-2xl font-bold text-brand-text motion-safe:animate-pulse" aria-hidden="true">:</span>

          <div className="flex flex-col items-center">
            <div className="min-w-14 rounded-lg bg-surface-sunken px-3 py-3 text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.seconds)}
              </span>
            </div>
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              SEC
            </span>
          </div>
        </div>

        <p className="text-center text-sm tabular-nums text-muted-foreground">
          {isOnBreak && "On break"}
          {!isOnBreak && isCheckedIn && checkInTime && `Checked in at ${format(new Date(checkInTime), "hh:mm a")}`}
          {!isOnBreak && !isCheckedIn && !isActive && !isInCooldown && "Not clocked in"}
          {!isOnBreak && !isActive && isInCooldown && `Cooldown: ${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`}
        </p>

        {isOnBreak && (
          <div className="flex justify-center">
            <Badge variant="warning">
              <Coffee className="size-3" aria-hidden="true" /> On Break
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleCheckIn}
            disabled={isActive || isPending || isInCooldown}
            loading={checkInMutation.isPending}
            variant={isActive ? "outline" : "default"}
            className="font-semibold"
          >
            {!checkInMutation.isPending && <LogIn className="size-4" aria-hidden="true" />}
            {isInCooldown
              ? `Wait ${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`
              : "Check In"}
          </Button>

          <Button
            onClick={handleClockAction}
            disabled={!isActive || isPending}
            loading={checkOutMutation.isPending}
            variant={isActive ? "secondary" : "outline"}
            className="font-semibold"
          >
            {!checkOutMutation.isPending && <LogOut className="size-4" aria-hidden="true" />}
            Check Out
          </Button>
        </div>

        {isActive && (
          <Button
            variant="outline"
            onClick={handleBreakToggle}
            loading={breakMutation.isPending}
            className="w-full"
          >
            {breakMutation.isPending ? null : isOnBreak ? (
              <Play className="size-4" aria-hidden="true" />
            ) : (
              <Pause className="size-4" aria-hidden="true" />
            )}
            {isOnBreak ? "Resume Work" : "Take Break"}
          </Button>
        )}

        {dailyStats && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Work</p>
              <p className="text-sm font-semibold tabular-nums">{formatDuration(dailyStats.workHours)}</p>
            </div>
            <div className="text-center">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Break</p>
              <p className="text-sm font-semibold tabular-nums">{formatDuration(dailyStats.breakHours)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    <OvertimeWorklogSheet
      open={!!otPrompt}
      date={otPrompt?.date ?? null}
      totalWorkHours={otPrompt?.hours}
      onClose={() => setOtPrompt(null)}
    />
    </>
  );
});
