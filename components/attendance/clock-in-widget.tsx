"use client";

import { Button } from "../ui/button";
import { format } from "date-fns";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
} from "../../lib/hooks/trpc-hooks";
import { toast } from "sonner";
import { Clock, Loader2, Timer } from "lucide-react";

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

  const isPending =
    checkInMutation.isPending || checkOutMutation.isPending || isLoading;

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

  return (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-end">
        <div className="text-muted-foreground font-bold text-sm tracking-wide">
          {format(now, "hh:mm a - EEE dd, MMM yyyy").toUpperCase()}
        </div>

        <div className="flex items-center gap-4 mt-1">
          {(hasActivePunch || isOnBreak) && sessionTime && (
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono font-bold text-primary">
                {String(sessionTime.hours).padStart(2, "0")}:
                {String(sessionTime.minutes).padStart(2, "0")}:
                {String(sessionTime.seconds).padStart(2, "0")}
              </span>
            </div>
          )}

          {dailyStats && parseFloat(dailyStats.workHours) > 0 && (
            <div className="text-xs text-muted-foreground">
              {parseFloat(dailyStats.workHours).toFixed(1)}h worked
              {parseFloat(dailyStats.breakHours) > 0 && ` · ${parseFloat(dailyStats.breakHours).toFixed(1)}h break`}
            </div>
          )}
        </div>
      </div>

      <Button
        variant={hasActivePunch ? "outline" : isInCooldown ? "secondary" : "destructive"}
        disabled={isPending || (!hasActivePunch && isInCooldown)}
        onClick={handleClockAction}
        className={`font-bold px-6 py-2 h-auto text-xs tracking-wider rounded-sm shadow-lg ${
          hasActivePunch
            ? "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            : isInCooldown
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasActivePunch ? (
          "WEB CLOCK-OUT"
        ) : isInCooldown ? (
          <span className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5" />
            {formatCooldown(localCooldown)}
          </span>
        ) : (
          "WEB CLOCK-IN"
        )}
      </Button>
    </div>
  );
}
