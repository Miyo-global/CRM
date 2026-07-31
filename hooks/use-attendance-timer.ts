import { useState, useEffect } from "react";
import { type TodayLog } from "../types/api";

export function useAttendanceTimer(todayLog: TodayLog | null, status: string) {
  const [elapsed, setElapsed] = useState(0);

  const checkIn = todayLog?.checkIn ?? null;
  const checkOut = todayLog?.checkOut ?? null;
  const breakHours = todayLog?.breakHours ?? null;

  useEffect(() => {
    if (checkIn && !checkOut && status !== "ON_BREAK") {
      const compute = () => {
        const start = new Date(checkIn).getTime();
        const breakMs = (Number(breakHours) || 0) * 60 * 60 * 1000;
        return Date.now() - start - breakMs;
      };
      setElapsed(compute());
      const interval = setInterval(() => setElapsed(compute()), 1000);
      return () => clearInterval(interval);
    }

    if (checkIn && checkOut) {
      const start = new Date(checkIn).getTime();
      const end = new Date(checkOut).getTime();
      const breakMs = (Number(breakHours) || 0) * 60 * 60 * 1000;
      setElapsed(end - start - breakMs);
      return;
    }

    if (checkIn && status === "ON_BREAK") {
      const start = new Date(checkIn).getTime();
      const breakMs = (Number(breakHours) || 0) * 60 * 60 * 1000;
      setElapsed(Date.now() - start - breakMs);
      return;
    }

    setElapsed(0);
  }, [checkIn, checkOut, breakHours, status]);

  const formatTime = (ms: number) => {
    if (ms < 0) return "00:00:00";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return { elapsed, formatTime };
}
