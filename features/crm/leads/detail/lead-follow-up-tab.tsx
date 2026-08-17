"use client";

import { memo, useCallback } from "react";
import {
  Phone, Mail, Calendar, Clock,
  Plus, Loader2, CalendarClock, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import type { Task, TaskType } from "@/lib/api/hooks/tasks";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";


export function formatTaskDue(dueDate: string | null): string {
  if (!dueDate) return "No date";
  const d = new Date(dueDate);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  const formatted = d.toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString(DEFAULT_LOCALE, { hour: "2-digit", minute: "2-digit", hour12: true });
  if (diffDays < 0) return `Overdue · ${formatted}`;
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  return `${formatted} · ${time}`;
}

const FOLLOW_UP_TYPES: { value: TaskType; label: string }[] = [
  { value: "CALL",    label: "Call"    },
  { value: "EMAIL",   label: "Email"   },
  { value: "MEETING", label: "Meeting" },
  { value: "CUSTOM",  label: "Other"   },
];

function getTaskIcon(type: TaskType) {
  switch (type) {
    case "CALL":    return <Phone className="h-3.5 w-3.5" />;
    case "EMAIL":   return <Mail className="h-3.5 w-3.5" />;
    case "MEETING": return <Calendar className="h-3.5 w-3.5" />;
    default:        return <Clock className="h-3.5 w-3.5" />;
  }
}

function getTaskIconColor(type: TaskType): string {
  switch (type) {
    case "CALL":    return "bg-blue-500/15 text-blue-400";
    case "EMAIL":   return "bg-purple-500/15 text-purple-400";
    case "MEETING": return "bg-amber-500/15 text-amber-400";
    default:        return "bg-muted text-muted-foreground";
  }
}


interface FollowUpTypeItemProps {
  value: TaskType;
  label: string;
}

const FollowUpTypeItem = memo(function FollowUpTypeItem({ value, label }: FollowUpTypeItemProps) {
  return (
    <SelectItem key={value} value={value} className="text-xs">
      {label}
    </SelectItem>
  );
});


interface PendingTaskRowProps {
  task: Task;
  isCompletingPending: boolean;
  onComplete: (taskId: number) => void;
}

const PendingTaskRow = memo(function PendingTaskRow({
  task,
  isCompletingPending,
  onComplete,
}: PendingTaskRowProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const handleComplete = useCallback(() => onComplete(task.id), [task.id, onComplete]);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
      <div className={cn(
        "h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
        getTaskIconColor(task.type),
      )}>
        {getTaskIcon(task.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-tight">{task.title}</p>
        <p className={cn(
          "text-[10px] mt-0.5",
          isOverdue ? "text-red-400 font-medium" : "text-muted-foreground",
        )}>
          {formatTaskDue(task.dueDate)}
        </p>
        {task.notes && (
          <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">{task.notes}</p>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-emerald-400"
        onClick={handleComplete}
        disabled={isCompletingPending}
        title="Mark as done"
      >
        <CheckCircle2 className="h-4 w-4" />
      </Button>
    </div>
  );
});


interface DoneTaskRowProps {
  task: Task;
}

const DoneTaskRow = memo(function DoneTaskRow({ task }: DoneTaskRowProps) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/10 border border-border/20">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      <span className="text-[11px] text-muted-foreground/70 line-through truncate flex-1">
        {task.title}
      </span>
      <span className="text-[10px] text-muted-foreground/50 shrink-0">
        {task.completedAt
          ? new Date(task.completedAt).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" })
          : ""}
      </span>
    </div>
  );
});


export interface FollowUpTabState {
  fuTitle: string;
  fuType: TaskType;
  fuDate: string;
  fuTime: string;
  fuNotes: string;
}

export interface LeadFollowUpTabProps {
  pendingTasks: Task[];
  doneTasks: Task[];
  state: FollowUpTabState;
  isScheduling: boolean;
  isCompletingPending: boolean;
  onStateChange: <K extends keyof FollowUpTabState>(key: K, value: FollowUpTabState[K]) => void;
  onSchedule: () => void;
  onComplete: (taskId: number) => void;
}

export const LeadFollowUpTab = memo(function LeadFollowUpTab({
  pendingTasks,
  doneTasks,
  state,
  isScheduling,
  isCompletingPending,
  onStateChange,
  onSchedule,
  onComplete,
}: LeadFollowUpTabProps) {
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onStateChange("fuTitle", e.target.value),
    [onStateChange],
  );
  const handleTypeChange = useCallback(
    (v: string) => onStateChange("fuType", v as TaskType),
    [onStateChange],
  );
  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onStateChange("fuTime", e.target.value),
    [onStateChange],
  );
  const handleDateChange = useCallback(
    (v: string) => onStateChange("fuDate", v),
    [onStateChange],
  );
  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onStateChange("fuNotes", e.target.value),
    [onStateChange],
  );

  return (
    <div className="mt-4 space-y-5">
      {/* ── Schedule new follow-up ─────────────────────────── */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <Plus className="h-3.5 w-3.5 text-gold" />
          Schedule Follow-up
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Title *</Label>
            <Input
              placeholder="e.g. Call to discuss SIP plan"
              value={state.fuTitle}
              onChange={handleTitleChange}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Type</Label>
            <Select value={state.fuType} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_TYPES.map((t) => (
                  <FollowUpTypeItem key={t.value} value={t.value} label={t.label} />
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Time</Label>
            <Input
              type="time"
              value={state.fuTime}
              onChange={handleTimeChange}
              className="h-8 text-xs"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Date *</Label>
            <DatePicker
              value={state.fuDate}
              onChange={handleDateChange}
              placeholder="Pick a date"
              fromDate={new Date()}
              className="h-8 text-xs"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Notes (optional)</Label>
            <Textarea
              placeholder="Any context for this follow-up..."
              value={state.fuNotes}
              onChange={handleNotesChange}
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <Button
          size="sm"
          className="w-full h-8 text-xs bg-gold hover:bg-gold/90 text-white gap-1.5"
          onClick={onSchedule}
          disabled={isScheduling}
        >
          {isScheduling
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <CalendarClock className="h-3.5 w-3.5" />
          }
          Schedule Follow-up
        </Button>
      </div>

      {/* ── Pending follow-ups ─────────────────────────────── */}
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pending ({pendingTasks.length})
          </p>
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <PendingTaskRow
                key={task.id}
                task={task}
                isCompletingPending={isCompletingPending}
                onComplete={onComplete}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Completed follow-ups (compact) ─────────────────── */}
      {doneTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Completed ({doneTasks.length})
          </p>
          <div className="space-y-1.5">
            {doneTasks.slice(0, 5).map((task) => (
              <DoneTaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {pendingTasks.length === 0 && doneTasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground/50">
          <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">No follow-ups yet</p>
          <p className="text-[11px] mt-0.5">Schedule one above to stay on track</p>
        </div>
      )}
    </div>
  );
});
