"use client";

import { useState, useCallback } from "react";
import {
  useCalibrationSessions,
  useCreateCalibration,
  useUpdateCalibration,
} from "@/lib/api/hooks/hr/recruitment";
import { useCalendarOrgMembers } from "@/lib/api/hooks/calendar";
import { getErrorMessage } from "@/lib/get-error-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Users, Calendar, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CalibrationTabProps {
  candidateId: number;
}

const DECISIONS = [
  { value: "STRONG_HIRE", label: "Strong Hire", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  { value: "HIRE", label: "Hire", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  { value: "HOLD", label: "Hold", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  { value: "NO_HIRE", label: "No Hire", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
] as const;

function decisionBadge(d: string | null) {
  if (!d) return null;
  const found = DECISIONS.find((x) => x.value === d);
  if (!found) return <Badge variant="outline">{d}</Badge>;
  return <Badge className={cn("border-0", found.color)}>{found.label}</Badge>;
}

function statusColor(s: string): "default" | "secondary" | "outline" | "destructive" {
  if (s === "completed") return "default";
  if (s === "scheduled") return "secondary";
  if (s === "cancelled") return "destructive";
  return "outline";
}

export function CalibrationTab({ candidateId }: CalibrationTabProps) {
  const { data: sessions, isLoading } = useCalibrationSessions(candidateId);
  const { data: orgMembers } = useCalendarOrgMembers();
  const createCalibration = useCreateCalibration(candidateId);
  const updateCalibration = useUpdateCalibration(candidateId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<string>("");
  const [status, setStatus] = useState<string>("pending");

  const resetForm = useCallback(() => {
    setScheduledAt("");
    setNotes("");
    setDecision("");
    setStatus("pending");
    setEditingId(null);
  }, []);

  const handleCreate = useCallback(() => {
    createCalibration.mutate(
      {
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Calibration session created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [scheduledAt, notes, createCalibration, resetForm]);

  const handleUpdate = useCallback(() => {
    if (!editingId) return;
    updateCalibration.mutate(
      {
        id: editingId,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        notes: notes || null,
        decision: decision ? (decision as "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD") : null,
        status: status as "pending" | "scheduled" | "completed" | "cancelled",
      },
      {
        onSuccess: () => {
          toast.success("Session updated");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [editingId, scheduledAt, notes, decision, status, updateCalibration, resetForm]);

  const openEdit = useCallback(
    (session: NonNullable<typeof sessions>[number]) => {
      setEditingId(session.id);
      setScheduledAt(session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : "");
      setNotes(session.notes ?? "");
      setDecision(session.decision ?? "");
      setStatus(session.status);
      setSheetOpen(true);
    },
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Calibration sessions are held after scorecards are submitted to align on a hiring decision.
        </p>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setSheetOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Session
        </Button>
      </div>

      {!sessions?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No calibration sessions yet.</p>
          </CardContent>
        </Card>
      ) : (
        sessions.map((session) => (
          <Card key={session.id} className="hover:border-primary/30 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Calibration #{session.id}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {decisionBadge(session.decision)}
                  <Badge variant={statusColor(session.status)}>{session.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {session.scheduledAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(session.scheduledAt), "PPp")}
                </p>
              )}
              {session.participantIds.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  {session.participantIds.length} participant{session.participantIds.length !== 1 ? "s" : ""}
                </p>
              )}
              {session.notes && (
                <div className="text-sm bg-muted/40 rounded-md p-3 mt-2 whitespace-pre-wrap">
                  {session.notes}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openEdit(session)}>
                  Edit
                </Button>
                {session.status !== "completed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-emerald-600"
                    onClick={() =>
                      updateCalibration.mutate(
                        { id: session.id, status: "completed" },
                        { onSuccess: () => toast.success("Marked as completed") }
                      )
                    }
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Complete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) resetForm();
        }}
      >
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">
              {editingId ? "Edit Calibration Session" : "New Calibration Session"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Scheduled Date & Time</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            {editingId && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Decision</label>
                  <Select value={decision} onValueChange={setDecision}>
                    <SelectTrigger><SelectValue placeholder="No decision yet" /></SelectTrigger>
                    <SelectContent>
                      {DECISIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Discussion points, consensus, action items..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <SheetFooter className="px-4 py-3 border-t flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSheetOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={createCalibration.isPending || updateCalibration.isPending}
            >
              {editingId ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
