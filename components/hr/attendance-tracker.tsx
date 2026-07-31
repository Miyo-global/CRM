"use client";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { MapPin, Coffee, LogOut } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import {
  useHrCheckIn,
  useHrCheckOut,
  useHrToggleBreak,
} from "@/lib/api/hooks/hr";
import { useAttendanceTimer } from "../../hooks/use-attendance-timer";
import { type AttendanceStatus, type TodayLog } from "../../types/api";

interface AttendanceTrackerProps {
  initialStatus: AttendanceStatus;
  todayLog: TodayLog | null;
}

export function AttendanceTracker({
  initialStatus,
  todayLog,
}: AttendanceTrackerProps) {
  const { elapsed, formatTime } = useAttendanceTimer(todayLog, initialStatus);

  const checkInMutation = useHrCheckIn({
    onSuccess: () => {
      toast.success("Checked In!");
    },
    onError: (e) => toast.error(e.message),
  });
  const checkOutMutation = useHrCheckOut({
    onSuccess: () => {
      toast.success("Checked Out!");
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleBreakMutation = useHrToggleBreak({
    onSuccess: () => {
      toast.success("Break status updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const loading =
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    toggleBreakMutation.isPending;

  const handleCheckIn = async () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          checkInMutation.mutate({ location: { lat: latitude, lng: longitude }, localDate: new Date().toLocaleDateString("en-CA") });
        },
        (error) => {
          toast.error("Location required for Check-In");
        }
      );
    } else {
      toast.error("Geolocation not supported");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-sidebar-border bg-sidebar text-sidebar-foreground">
      <CardHeader>
        <CardTitle className="text-center text-gold">
          Attendance Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-5xl font-mono font-bold tracking-widest text-white">
            {initialStatus === "OFFLINE" ? "00:00:00" : formatTime(elapsed)}
          </div>
          <p className="text-sm text-zinc-400 mt-2">
            {initialStatus === "OFFLINE"
              ? "Not Checked In"
              : initialStatus === "ON_BREAK"
              ? "On Break"
              : initialStatus === "CHECKED_OUT"
              ? "Shift Completed"
              : "Working"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {initialStatus === "OFFLINE" && (
            <Button
              onClick={handleCheckIn}
              disabled={loading}
              className="col-span-2 bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
            >
              <MapPin className="mr-2 h-5 w-5" /> Check In
            </Button>
          )}

          {(initialStatus === "PRESENT" || initialStatus === "ON_BREAK") && (
            <>
              <Button
                onClick={() => toggleBreakMutation.mutate()}
                disabled={loading}
                variant="outline"
                className={cn(
                  "h-12 border-primary/20",
                  initialStatus === "ON_BREAK"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "text-white hover:bg-white/10"
                )}
              >
                <Coffee className="mr-2 h-5 w-5" />
                {initialStatus === "ON_BREAK" ? "Resume Work" : "Take Break"}
              </Button>

              <Button
                onClick={() => checkOutMutation.mutate({ localDate: new Date().toLocaleDateString("en-CA") })}
                disabled={loading || initialStatus === "ON_BREAK"}
                variant="destructive"
                className="h-12"
              >
                <LogOut className="mr-2 h-5 w-5" /> Check Out
              </Button>
            </>
          )}

          {initialStatus === "CHECKED_OUT" && (
            <div className="col-span-2 text-center text-zinc-400 py-2 bg-white/5 rounded-lg">
              See you tomorrow!
            </div>
          )}
        </div>

        {todayLog && (
          <div className="text-xs text-zinc-500 flex justify-between px-2">
            <span>
              In:{" "}
              {todayLog.checkIn
                ? format(new Date(todayLog.checkIn), "hh:mm a")
                : "--"}
            </span>
            <span>
              Out:{" "}
              {todayLog.checkOut
                ? format(new Date(todayLog.checkOut), "hh:mm a")
                : "--"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
