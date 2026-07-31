"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTasksIllustration } from "@/components/illustrations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Mail,
  Video,
  Pencil,
  Plus,
  CheckSquare,
  AlertTriangle,
  UserPlus,
  Sparkles,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useOrgMembers } from "@/lib/api/hooks/organization";
import { cn } from "@/lib/utils";
import { format, isToday, isPast } from "date-fns";
import {
  useMyTaskQueue,
  useCreateTask,
  useCompleteTask,
  useAIPrioritizeTasks,
  type TaskWithBucket,
  type TaskType,
  type CreateTaskInput,
  type TaskPriorityResult,
} from "@/lib/api/hooks/tasks";
import { CallLogDialog } from "@/components/tasks/call-log-dialog";
import { EmailTaskDialog } from "@/components/tasks/email-task-dialog";


const TYPE_ICONS: Record<TaskType, React.ElementType> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  CUSTOM: Pencil,
};

const TYPE_COLORS: Record<TaskType, string> = {
  CALL: "text-blue-500",
  EMAIL: "text-amber-500",
  MEETING: "text-purple-500",
  CUSTOM: "text-muted-foreground",
};

const BUCKET_LABELS: Record<TaskWithBucket["bucket"], string> = {
  OVERDUE: "Overdue",
  TODAY: "Due Today",
  THIS_WEEK: "This Week",
  UPCOMING: "Upcoming",
  NO_DATE: "No Date",
};

const BUCKET_COLORS: Record<TaskWithBucket["bucket"], string> = {
  OVERDUE: "text-destructive",
  TODAY: "text-amber-600",
  THIS_WEEK: "text-foreground",
  UPCOMING: "text-muted-foreground",
  NO_DATE: "text-muted-foreground",
};

const TYPE_FILTER_OPTIONS: Array<{ value: "ALL" | TaskType; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "CUSTOM", label: "Custom" },
];

const MANAGER_ROLES = ["CEO", "ADMIN", "SALES_DIRECTOR", "BRANCH_MANAGER", "HR", "ENGINEERING_LEAD"];


function AddTaskForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("CUSTOM");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [showAssign, setShowAssign] = useState(false);

  const { data: session } = useSession();
  const isManager = session?.user?.role ? MANAGER_ROLES.includes(session.user.role) : false;
  const { data: membersData } = useOrgMembers(1, 50, undefined, { enabled: isManager && showAssign });

  const createTask = useCreateTask();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const input: CreateTaskInput = {
      title: title.trim(),
      type,
      ...(dueDate && { dueDate: new Date(dueDate).toISOString() }),
      ...(assigneeId && { assigneeId }),
    };

    createTask.mutate(input, {
      onSuccess: () => {
        setTitle("");
        setDueDate("");
        setType("CUSTOM");
        setAssigneeId("");
        onCreated();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <Input
        placeholder="Task title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="New task title"
        className="h-8 text-sm"
      />
      <div className="flex gap-2">
        <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
          <SelectTrigger className="h-8 text-xs flex-1" aria-label="Task type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CALL">Call</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="MEETING">Meeting</SelectItem>
            <SelectItem value="CUSTOM">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-8 text-xs flex-1"
          aria-label="Due date"
        />
      </div>
      {isManager && (
        <div>
          {!showAssign ? (
            <button
              type="button"
              onClick={() => setShowAssign(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <UserPlus className="h-3 w-3" />
              Assign to rep
            </button>
          ) : (
            <Select value={assigneeId || "_self"} onValueChange={(v) => setAssigneeId(v === "_self" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs" aria-label="Assign to">
                <SelectValue placeholder="Assign to…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_self">Myself</SelectItem>
                {(membersData?.data ?? []).map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      <Button
        type="submit"
        size="sm"
        className="w-full h-8"
        disabled={!title.trim() || createTask.isPending}
      >
        {createTask.isPending ? "Adding…" : "Add Task"}
      </Button>
    </form>
  );
}


function TaskCard({ task }: { task: TaskWithBucket }) {
  const [showCallLog, setShowCallLog] = useState(false);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const completeTask = useCompleteTask();
  const Icon = TYPE_ICONS[task.type];

  const handleComplete = () => {
    if (task.type === "CALL") {
      setShowCallLog(true);
      return;
    }
    if (task.type === "EMAIL") {
      setShowEmailCompose(true);
      return;
    }
    completeTask.mutate({ taskId: task.id });
  };

  const dueLabel = task.dueDate
    ? isToday(new Date(task.dueDate))
      ? "Today"
      : format(new Date(task.dueDate), "MMM d")
    : null;

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-3 p-2.5 rounded-lg border bg-card",
          task.bucket === "OVERDUE" && "border-destructive/40 bg-destructive/5",
        )}
      >
        <Checkbox
          checked={false}
          onCheckedChange={handleComplete}
          disabled={completeTask.isPending}
          aria-label={`Mark "${task.title}" as done`}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
          {task.notes && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{task.notes}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Icon
              className={cn("h-3 w-3 shrink-0", TYPE_COLORS[task.type])}
              aria-hidden="true"
            />
            <span className="text-[11px] text-muted-foreground capitalize">
              {task.type.toLowerCase()}
            </span>
            {dueLabel && (
              <>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span
                  className={cn(
                    "text-[11px] flex items-center gap-0.5",
                    BUCKET_COLORS[task.bucket],
                  )}
                >
                  {task.bucket === "OVERDUE" && (
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  )}
                  {dueLabel}
                </span>
              </>
            )}
            {task.type === "CALL" && (
              <button
                onClick={() => setShowCallLog(true)}
                className="ml-auto text-[11px] text-blue-500 hover:underline shrink-0"
              >
                Log Call
              </button>
            )}
            {task.type === "EMAIL" && (
              <button
                onClick={() => setShowEmailCompose(true)}
                className="ml-auto text-[11px] text-amber-500 hover:underline shrink-0"
              >
                Compose
              </button>
            )}
          </div>
        </div>
      </div>
      {showCallLog && (
        <CallLogDialog task={task} onClose={() => setShowCallLog(false)} />
      )}
      {showEmailCompose && (
        <EmailTaskDialog task={task} onClose={() => setShowEmailCompose(false)} />
      )}
    </>
  );
}


interface MyTasksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MyTasksPanel({ open, onOpenChange }: MyTasksPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"ALL" | TaskType>("ALL");
  const [aiPriority, setAiPriority] = useState<TaskPriorityResult | null>(null);

  const { data: tasks, isLoading } = useMyTaskQueue();
  const aiPrioritize = useAIPrioritizeTasks();

  const filtered =
    typeFilter === "ALL"
      ? (tasks ?? [])
      : (tasks ?? []).filter((t) => t.type === typeFilter);

  const bucketOrder: TaskWithBucket["bucket"][] = [
    "OVERDUE",
    "TODAY",
    "THIS_WEEK",
    "UPCOMING",
    "NO_DATE",
  ];

  const grouped = bucketOrder.reduce<Record<TaskWithBucket["bucket"], TaskWithBucket[]>>(
    (acc, bucket) => {
      acc[bucket] = filtered.filter((t) => t.bucket === bucket);
      return acc;
    },
    { OVERDUE: [], TODAY: [], THIS_WEEK: [], UPCOMING: [], NO_DATE: [] },
  );

  const overdueCount = grouped.OVERDUE.length;

  const aiRankMap = aiPriority
    ? new Map(aiPriority.items.map((item) => [item.taskId, item]))
    : null;

  const aiSortedTasks: TaskWithBucket[] = aiRankMap
    ? [...filtered].sort((a, b) => {
        const ra = aiRankMap.get(a.id)?.rank ?? 999;
        const rb = aiRankMap.get(b.id)?.rank ?? 999;
        return ra - rb;
      })
    : [];

  function handleAIPrioritize() {
    aiPrioritize.mutate(undefined, {
      onSuccess: (data) => setAiPriority(data),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
        aria-label="My Tasks panel"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4 text-primary" aria-hidden="true" />
              My Tasks
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                  {overdueCount} overdue
                </Badge>
              )}
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={aiPriority ? "secondary" : "outline"}
                className="h-7 gap-1 text-xs"
                onClick={aiPriority ? () => setAiPriority(null) : handleAIPrioritize}
                disabled={aiPrioritize.isPending}
                title={aiPriority ? "Clear AI sort" : "AI-prioritize my tasks"}
              >
                {aiPriority ? (
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {aiPrioritize.isPending ? "Thinking…" : aiPriority ? "Clear" : "AI Sort"}
              </Button>
              <Button
                size="sm"
                variant={showAddForm ? "secondary" : "default"}
                className="h-7 gap-1 text-xs"
                onClick={() => setShowAddForm((v) => !v)}
                aria-expanded={showAddForm}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Task
              </Button>
            </div>
          </div>

          <div className="flex gap-1 flex-wrap pt-1">
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                className={cn(
                  "filter-chip text-xs px-2 py-0.5 rounded-full border transition-colors",
                  typeFilter === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:bg-muted/70",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {showAddForm && (
          <div className="px-4 pt-3 pb-0 shrink-0">
            <AddTaskForm onCreated={() => setShowAddForm(false)} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              illustration={<EmptyTasksIllustration className="h-24 w-24" />}
              title="No pending tasks"
              description="You're all caught up! Add a task to get started."
              compact
            />
          ) : aiPriority ? (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Recommended Order
                </div>
                <p className="text-xs text-muted-foreground">{aiPriority.summary}</p>
              </div>
              <div className="space-y-1.5">
                {aiSortedTasks.map((task) => {
                  const priorityItem = aiRankMap?.get(task.id);
                  return (
                    <div key={task.id} className="space-y-0.5">
                      <TaskCard task={task} />
                      {priorityItem && (
                        <p className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
                          <span className="font-semibold text-primary">#{priorityItem.rank}</span>
                          <span>·</span>
                          <span>Score {priorityItem.urgencyScore}</span>
                          <span>·</span>
                          <span className="truncate">{priorityItem.reasoning}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            bucketOrder.map((bucket) => {
              const items = grouped[bucket];
              if (items.length === 0) return null;
              return (
                <section key={bucket}>
                  <h3
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wide mb-2",
                      BUCKET_COLORS[bucket],
                    )}
                  >
                    {BUCKET_LABELS[bucket]} ({items.length})
                  </h3>
                  <div className="space-y-1.5">
                    {items.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
