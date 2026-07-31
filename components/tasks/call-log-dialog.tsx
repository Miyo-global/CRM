"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone } from "lucide-react";
import { useCompleteTask, useUpdateTask, type Task } from "@/lib/api/hooks/tasks";
import { toast } from "sonner";

const CALL_OUTCOMES = [
  { value: "REACHED", label: "Reached — spoke with contact" },
  { value: "VOICEMAIL", label: "Left voicemail" },
  { value: "NO_ANSWER", label: "No answer" },
  { value: "BUSY", label: "Line busy" },
  { value: "WRONG_NUMBER", label: "Wrong number" },
  { value: "CALLBACK_REQUESTED", label: "Callback requested" },
] as const;

type CallOutcome = (typeof CALL_OUTCOMES)[number]["value"];

interface CallLogDialogProps {
  task: Task;
  onClose: () => void;
}

export function CallLogDialog({ task, onClose }: CallLogDialogProps) {
  const [outcome, setOutcome] = useState<CallOutcome>("REACHED");
  const [notes, setNotes] = useState(task.notes ?? "");
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();

  function handleLog() {
    const outcomeLabel = CALL_OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome;
    const callNotes = `[Call Log] Outcome: ${outcomeLabel}${notes.trim() ? `\n${notes.trim()}` : ""}`;

    updateTask.mutate(
      { taskId: task.id, data: { notes: callNotes } },
      {
        onSuccess: () => {
          completeTask.mutate(
            { taskId: task.id },
            {
              onSuccess: () => {
                toast.success("Call logged and task completed");
                onClose();
              },
              onError: () => toast.error("Failed to complete task"),
            },
          );
        },
        onError: () => toast.error("Failed to save call log"),
      },
    );
  }

  const isPending = updateTask.isPending || completeTask.isPending;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-500" />
            Log Call — {task.title}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 px-4">
          <div className="space-y-1">
            <Label>Call Outcome *</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALL_OUTCOMES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              placeholder="What was discussed? Any follow-up actions?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleLog} disabled={isPending}>
            {isPending ? "Saving…" : "Log & Complete"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
