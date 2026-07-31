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
import { Clock, Coffee, LogIn, LogOut, Loader2, Play, Pause } from "lucide-react";
import { formatDuration, formatTimerSegment } from "./attendance-utils";
import { OvertimeWorklogSheet } from "./overtime-worklog-sheet";

export const TimerCard = memo(function TimerCard() {
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
    onError: (err) => toast.error(err.message),
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
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold" />
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pb-5">
        <div
          className="flex items-center justify-center gap-2"
          aria-label={`Session time: ${sessionTimer.hours} hours, ${sessionTimer.minutes} minutes, ${sessionTimer.seconds} seconds`}
        >
          <div className="flex flex-col items-center">
            <div className="bg-muted rounded-lg px-3 py-3 min-w-[56px] text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.hours)}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              HRS
            </span>
          </div>

          <span className="text-2xl font-bold text-gold animate-pulse mb-5">:</span>

          <div className="flex flex-col items-center">
            <div className="bg-muted rounded-lg px-3 py-3 min-w-[56px] text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.minutes)}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              MIN
            </span>
          </div>

          <span className="text-2xl font-bold text-gold animate-pulse mb-5">:</span>

          <div className="flex flex-col items-center">
            <div className="bg-muted rounded-lg px-3 py-3 min-w-[56px] text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.seconds)}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              SEC
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center italic">
          {isOnBreak && "On break"}
          {!isOnBreak && isCheckedIn && checkInTime && `Checked in at ${format(new Date(checkInTime), "hh:mm a")}`}
          {!isOnBreak && !isCheckedIn && !isActive && !isInCooldown && "Not clocked in"}
          {!isOnBreak && !isActive && isInCooldown && `Cooldown: ${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`}
        </p>

        {isOnBreak && (
          <div className="flex justify-center">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
              <Coffee className="h-3 w-3 mr-1" /> On Break
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleCheckIn}
            disabled={isActive || isPending || isInCooldown}
            variant={isActive ? "secondary" : "default"}
            className={`font-semibold ${
              !isActive && !isInCooldown
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : ""
            }`}
          >
            {checkInMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogIn className="h-4 w-4 mr-2" />
            )}
            {isInCooldown
              ? `Wait ${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`
              : "Check In"}
          </Button>

          <Button
            onClick={handleClockAction}
            disabled={!isActive || isPending}
            variant={isActive ? "default" : "secondary"}
            className={`font-semibold ${
              isActive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : ""
            }`}
          >
            {checkOutMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Check Out
          </Button>
        </div>

        {isActive && (
          <Button
            variant="outline"
            onClick={handleBreakToggle}
            disabled={breakMutation.isPending}
            className="w-full"
          >
            {breakMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isOnBreak ? (
              <Play className="h-4 w-4 mr-2" />
            ) : (
              <Pause className="h-4 w-4 mr-2" />
            )}
            {isOnBreak ? "Resume Work" : "Take Break"}
          </Button>
        )}

        {dailyStats && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Work</p>
              <p className="text-sm font-semibold">{formatDuration(dailyStats.workHours)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Break</p>
              <p className="text-sm font-semibold">{formatDuration(dailyStats.breakHours)}</p>
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
