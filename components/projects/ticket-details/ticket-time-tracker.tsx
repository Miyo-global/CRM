"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLogTime } from "@/lib/api/hooks/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Timer, Play, Square, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketTimeTrackerProps {
  ticketId: number;
  projectId: number;
  timeSpent: string | null;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TicketTimeTracker({ ticketId, projectId, timeSpent }: TicketTimeTrackerProps) {
  const logTime = useLogTime();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [manualHours, setManualHours] = useState("");
  const [description, setDescription] = useState("");
  const [showManual, setShowManual] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStart = useCallback(() => {
    setRunning(true);
    startTimeRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current!) / 1000));
    }, 1000);
  }, [elapsed]);

  const handleStop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const handleSaveTimer = useCallback(() => {
    if (elapsed < 1) {
      toast.error("No time recorded");
      return;
    }
    const hours = Math.max(0.01, elapsed / 3600);
    logTime.mutate(
      {
        projectId,
        ticketId,
        date: new Date().toISOString().slice(0, 10),
        hours: Math.round(hours * 100) / 100,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Time logged");
          setElapsed(0);
          setDescription("");
          setRunning(false);
          startTimeRef.current = null;
        },
        onError: (e) => toast.error((e as Error).message || "Failed to log time"),
      }
    );
  }, [elapsed, projectId, ticketId, description, logTime]);

  const handleLogManual = useCallback(() => {
    const h = parseFloat(manualHours);
    if (!h || h <= 0) {
      toast.error("Enter a valid number of hours");
      return;
    }
    logTime.mutate(
      {
        projectId,
        ticketId,
        date: new Date().toISOString().slice(0, 10),
        hours: h,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Time logged");
          setManualHours("");
          setDescription("");
          setShowManual(false);
        },
        onError: (e) => toast.error((e as Error).message || "Failed to log time"),
      }
    );
  }, [manualHours, projectId, ticketId, description, logTime]);

  const totalSpent = timeSpent ? parseFloat(timeSpent) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Time Tracking
          {totalSpent > 0 && (
            <span className="text-foreground font-semibold">{totalSpent}h logged</span>
          )}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => setShowManual((v) => !v)}
        >
          <Plus className="h-3 w-3 mr-1" />Log
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-mono flex-1",
          running ? "border-primary/50 bg-primary/5 text-primary" : "bg-muted/30"
        )}>
          <Timer className="h-3.5 w-3.5 shrink-0" />
          <span>{formatElapsed(elapsed)}</span>
        </div>
        {!running ? (
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 gap-1" onClick={handleStart}>
            <Play className="h-3 w-3" />Start
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs px-3 gap-1" onClick={handleStop}>
              <Square className="h-3 w-3" />Stop
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              onClick={handleSaveTimer}
              disabled={logTime.isPending}
            >
              Save
            </Button>
          </>
        )}
      </div>

      {(running || elapsed > 0) && (
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you work on? (optional)"
          className="h-7 text-xs mb-2"
        />
      )}

      {showManual && (
        <div className="flex items-center gap-2 pt-1 border-t mt-2">
          <Input
            type="number"
            min="0.01"
            step="0.25"
            placeholder="Hours"
            value={manualHours}
            onChange={(e) => setManualHours(e.target.value)}
            className="h-7 text-xs w-24"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-7 text-xs flex-1"
          />
          <Button
            size="sm"
            className="h-7 text-xs px-3 shrink-0"
            onClick={handleLogManual}
            disabled={logTime.isPending}
          >
            {logTime.isPending ? "..." : "Log"}
          </Button>
        </div>
      )}
    </div>
  );
}
