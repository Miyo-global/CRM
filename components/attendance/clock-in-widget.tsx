"use client";

import { Button } from "../ui/button";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
} from "../../lib/hooks/trpc-hooks";
import { toast } from "sonner";
import { Clock, Timer } from "lucide-react";
import { cn } from "../../lib/utils";
import { toneDot } from "../../lib/design/tones";
import { formatIST } from "@/lib/date-utils";

export function ClockInWidget() {
  const [now, setNow] = useState(new Date());
  const [localCooldown, setLocalCooldown] = useState(0);

  const { data: statusData, isLoading } = useHrAttendanceStatus();

  const checkInMutation = useHrCheckIn({
    onSuccess: () => {
      toast.success("Clocked in successfully!");
      setLocalCooldown(0);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const checkOutMutation = useHrCheckOut({
    onSuccess: () => {
      toast.success("Clocked out successfully!");
      setLocalCooldown(120);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  useEffect(() => {
    if (statusData?.cooldownRemaining && statusData.cooldownRemaining > 0) {
      setLocalCooldown(statusData.cooldownRemaining);
    }
  }, [statusData?.cooldownRemaining]);
  useEffect(() => {
    if (localCooldown > 0) {
      const timer = setTimeout(() => {
        setLocalCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [localCooldown]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isOnBreak = statusData?.status === "ON_BREAK";
  const hasActivePunch = Boolean(
    statusData?.todayLog?.checkIn && !statusData?.todayLog?.checkOut,
  );
  const isInCooldown = localCooldown > 0;

  const handleClockAction = useCallback(() => {
    const localDate = new Date().toLocaleDateString("en-CA");
    if (hasActivePunch) {
      checkOutMutation.mutate({ localDate });
    } else if (!isInCooldown) {
      checkInMutation.mutate({ location: undefined, localDate });
    }
  }, [hasActivePunch, isInCooldown, checkOutMutation, checkInMutation]);

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const sessionTime = useMemo(() => {
    if (!statusData?.todayLog?.checkIn || statusData?.todayLog?.checkOut) return null;
    const checkInTime = new Date(statusData.todayLog.checkIn);
    const diffMs = now.getTime() - checkInTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return { hours, minutes, seconds };
  }, [now, statusData?.todayLog]);

  const dailyStats = statusData?.dailyStats;

  const isActive = hasActivePunch || isOnBreak;
  const mutating = checkInMutation.isPending || checkOutMutation.isPending;

  return (
    <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-border bg-card py-1 pr-1 pl-3 shadow-xs">
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        {isActive && (
          <span className="absolute inline-flex size-full rounded-full bg-success-500 opacity-60 motion-safe:animate-ping" />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", isActive ? toneDot.success : toneDot.neutral)} />
      </span>

      <div className="flex min-w-0 flex-col leading-tight">
        {isActive && sessionTime ? (
          <span className="flex items-center gap-1.5 font-mono text-sm font-medium tabular-nums text-foreground">
            <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {String(sessionTime.hours).padStart(2, "0")}:
            {String(sessionTime.minutes).padStart(2, "0")}:
            {String(sessionTime.seconds).padStart(2, "0")}
          </span>
        ) : (
          <span className="truncate text-xs font-medium tabular-nums text-foreground">
            {formatIST(now, {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            IST
          </span>
        )}
        {dailyStats && parseFloat(dailyStats.workHours) > 0 && (
          {/* 2xs muted on the card background failed AA (QA-D010). */}
          <span className="truncate text-xs tabular-nums text-foreground/75">
            {parseFloat(dailyStats.workHours).toFixed(1)}h worked
            {parseFloat(dailyStats.breakHours) > 0 && ` · ${parseFloat(dailyStats.breakHours).toFixed(1)}h break`}
          </span>
        )}
      </div>

      <Button
        size="sm"
        variant={hasActivePunch ? "secondary" : isInCooldown ? "outline" : "default"}
        loading={mutating}
        disabled={isLoading || (!hasActivePunch && isInCooldown)}
        onClick={handleClockAction}
        className="shrink-0 rounded-full"
      >
        {hasActivePunch ? (
          "WEB CLOCK-OUT"
        ) : isInCooldown ? (
          <span className="flex items-center gap-1.5 tabular-nums">
            <Timer className="size-3.5" aria-hidden="true" />
            {formatCooldown(localCooldown)}
          </span>
        ) : (
          "WEB CLOCK-IN"
        )}
      </Button>
    </div>
  );
}
