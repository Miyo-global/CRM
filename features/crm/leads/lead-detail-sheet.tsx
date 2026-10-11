"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, Mail, MapPin, Building2, Target, ArrowRight, Calendar, Clock, MessageSquare, Edit3,
  CalendarClock, CheckCircle2, Plus, AlarmClock,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Timeline } from "@/components/shared/timeline";
import type { Tone } from "@/lib/design/tones";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useLeadDetail, useLogLeadActivity } from "@/lib/hooks/trpc-hooks";
import { useTasks, useCreateTask, useCompleteTask, type TaskType } from "@/lib/api/hooks/tasks";
import { toast } from "sonner";
import { STATUSES, STATUS_CONFIG, isActivityType, getInitials } from "./leads-constants";
import type { LeadStatus, LeadActivity } from "./leads-types";
import { ActivityForm } from "./activity-form";
import { AIScoreButton } from "./ai-score-button";
import { AIEmailDialog } from "./ai-email-dialog";
import { AINextActionButton } from "./ai-next-action-button";
import { AIEnrichLeadButton } from "./ai-enrich-lead-button";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const ACTIVITY_ICON: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  meeting: Calendar,
};

const ACTIVITY_TONE: Record<string, Tone> = {
  call: "info",
  email: "plum",
  whatsapp: "success",
  meeting: "warning",
};

interface LeadDetailSheetProps {
  leadId: number | null;
  open: boolean;
  onClose: () => void;
  onMoveStatus: (leadId: number, status: LeadStatus) => void;
}

interface StatusMoveButtonProps {
  status: LeadStatus;
  leadId: number;
  onMoveStatus: (leadId: number, status: LeadStatus) => void;
}

function StatusMoveButton({ status: s, leadId, onMoveStatus }: StatusMoveButtonProps) {
  const handleClick = useCallback(() => onMoveStatus(leadId, s), [leadId, s, onMoveStatus]);
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("text-xs h-8 gap-1.5", STATUS_CONFIG[s].border, "hover:bg-muted/50")}
      onClick={handleClick}
    >
      <ArrowRight className="h-3 w-3" />
      {STATUS_CONFIG[s].label}
    </Button>
  );
}

const FOLLOW_UP_TYPES: { value: TaskType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "CUSTOM", label: "Other" },
];

function formatTaskDue(dueDate: string | null): string {
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

export function LeadDetailSheet({ leadId, open, onClose, onMoveStatus }: LeadDetailSheetProps) {
  const router = useRouter();
  const { data: lead, isLoading } = useLeadDetail(leadId ?? 0);
  const logActivity = useLogLeadActivity();
  const [activityTab, setActivityTab] = useState("details");

  const [fuTitle, setFuTitle] = useState("");
  const [fuType, setFuType] = useState<TaskType>("CALL");
  const [fuDate, setFuDate] = useState("");
  const [fuTime, setFuTime] = useState("");
  const [fuNotes, setFuNotes] = useState("");

  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const { data: leadTasksData } = useTasks(
    leadId ? { entityType: "LEAD", entityId: leadId, limit: 20 } : undefined,
  );
  const pendingTasks = (leadTasksData?.tasks ?? []).filter((t) => t.status === "pending");
  const doneTasks = (leadTasksData?.tasks ?? []).filter((t) => t.status === "completed");

  const handleScheduleFollowUp = useCallback(async () => {
    if (!leadId) return;
    const title = fuTitle.trim();
    if (!title) { toast.error("Follow-up title is required"); return; }
    if (!fuDate) { toast.error("Please pick a date"); return; }

    const time = fuTime || "09:00";
    const dueDateObj = new Date(`${fuDate}T${time}:00`);
    if (Number.isNaN(dueDateObj.getTime())) { toast.error("Please pick a valid date and time"); return; }
    if (dueDateObj.getTime() <= Date.now()) { toast.error("Follow-up date must be in the future"); return; }
    const dueDate = dueDateObj.toISOString();

    try {
      await createTask.mutateAsync({
        title,
        type: fuType,
        notes: fuNotes.trim() || undefined,
        entityType: "LEAD",
        entityId: leadId,
        dueDate,
      });
      toast.success("Follow-up scheduled");
      setFuTitle("");
      setFuDate("");
      setFuTime("");
      setFuNotes("");
      setFuType("CALL");
    } catch {
      toast.error("Failed to schedule follow-up");
    }
  }, [leadId, fuTitle, fuType, fuDate, fuTime, fuNotes, createTask]);

  const handleCompleteTask = useCallback(async (taskId: number) => {
    try {
      await completeTask.mutateAsync({ taskId });
      toast.success("Follow-up marked complete");
    } catch {
      toast.error("Failed to complete task");
    }
  }, [completeTask]);

  const handleEditLead = useCallback(() => {
    if (!leadId) return;
    onClose();
    router.push(`/crm/leads/${leadId}`);
  }, [leadId, onClose, router]);

  const handleLogActivity = useCallback(async (formData: FormData) => {
    if (!leadId) return;
    try {
      const activityType = formData.get("activityType");
      if (!isActivityType(activityType)) {
        toast.error("Invalid activity type");
        return;
      }
      await logActivity.mutateAsync({
        leadId,
        type: activityType,
        date: new Date().toISOString(),
        duration: formData.get("duration") ? Number(formData.get("duration")) : undefined,
        subject: formData.get("subject") as string || undefined,
        notes: formData.get("activityNotes") as string || undefined,
        outcome: formData.get("outcome") as string || undefined,
        location: formData.get("location") as string || undefined,
        messageSummary: formData.get("messageSummary") as string || undefined,
      });
      toast.success("Activity logged");
    } catch {
      toast.error("Failed to log activity");
    }
  }, [leadId, logActivity]);

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent size="md" className="w-full gap-0 overflow-y-auto p-0">
        {isLoading || !lead ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>

            <div className="sticky top-0 z-sticky border-b border-border bg-background px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0 flex-1">
                  <SheetHeader className="p-0">
                    <SheetTitle className="font-display text-xl">{lead.name}</SheetTitle>
                  </SheetHeader>
                  {lead.company && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{lead.company}</span>
                      {lead.designation && (
                        <span className="text-subtle-foreground">· {lead.designation}</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {STATUS_CONFIG[lead.status as LeadStatus] && (
                    <StatusPill tone={STATUS_CONFIG[lead.status as LeadStatus].tone} dot className="shrink-0">
                      {STATUS_CONFIG[lead.status as LeadStatus].label}
                    </StatusPill>
                  )}
                  <Button variant="outline" size="sm" onClick={handleEditLead}>
                    <Edit3 />
                    Edit
                  </Button>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">

              <div className="space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Tools</p>
                <div className="flex gap-2 flex-wrap items-center">
                  <AIScoreButton leadId={lead.id} currentScore={lead.score} compact />
                  <AINextActionButton leadId={lead.id} compact />
                  <AIEmailDialog
                    leadName={lead.name}
                    company={lead.company}
                    designation={lead.designation}
                    potentialValue={lead.potentialValue ?? undefined}
                  />
                  <AIEnrichLeadButton
                    leadName={lead.name}
                    company={lead.company}
                    email={lead.email}
                    designation={lead.designation}
                    city={lead.city}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Move to</p>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.filter(s => s !== lead.status && s !== "LOST").map(s => (
                    <StatusMoveButton key={s} status={s} leadId={lead.id} onMoveStatus={onMoveStatus} />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {lead.email && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <a href={`mailto:${lead.email}`} className="text-brand-text hover:underline truncate text-sm">
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <a href={`tel:${lead.phone}`} className="hover:underline text-sm">{lead.phone}</a>
                    </div>
                  )}
                  {lead.city && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span>{lead.city}</span>
                    </div>
                  )}
                  {lead.source && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="capitalize">{lead.source.replace("_", " ")}</span>
                    </div>
                  )}
                </div>
              </div>

              {(lead.potentialValue || lead.investmentInterest) && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Financials</p>
                  <div className="grid grid-cols-2 gap-3">
                    {lead.potentialValue && (
                      <div className="rounded-lg border border-border bg-card p-3.5">
                        <p className="text-2xs text-muted-foreground mb-1">Potential Value</p>
                        <p className="font-display text-lg font-semibold tabular-nums text-success-strong">
                          ₹{Number(lead.potentialValue).toLocaleString(DEFAULT_LOCALE)}
                        </p>
                      </div>
                    )}
                    {lead.investmentInterest && (
                      <div className="rounded-lg border border-border bg-card p-3.5">
                        <p className="text-2xs text-muted-foreground mb-1">Investment Interest</p>
                        <p className="font-display text-lg font-semibold tabular-nums text-foreground">
                          ₹{Number(lead.investmentInterest).toLocaleString(DEFAULT_LOCALE)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {lead.assignedTo && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned To</p>
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={resolveImageUrl(lead.assignedTo.image)} />
                      <AvatarFallback className="text-xs">
                        {getInitials(lead.assignedTo.name ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{lead.assignedTo.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.assignedTo.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {lead.notes && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
                  <div className="rounded-lg border border-border bg-surface-sunken p-3.5">
                    <p className="text-sm leading-relaxed">{lead.notes}</p>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Tabs value={activityTab} onValueChange={setActivityTab}>
                  <TabsList variant="underline">
                    <TabsTrigger value="details" className="flex-1 text-xs">Details</TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1 text-xs">Activity</TabsTrigger>
                    <TabsTrigger value="new-activity" className="flex-1 text-xs">Log</TabsTrigger>
                    <TabsTrigger value="follow-up" className="flex-1 text-xs gap-1">
                      <AlarmClock className="h-3 w-3 shrink-0" />
                      Follow-up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                        <p className="text-2xs text-muted-foreground mb-1">Created</p>
                        <p className="text-sm font-medium">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                        <p className="text-2xs text-muted-foreground mb-1">Assigned</p>
                        <p className="text-sm font-medium">
                          {lead.assignedAt ? new Date(lead.assignedAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                      {lead.convertedAt && (
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-2xs text-muted-foreground mb-1">Converted</p>
                          <p className="text-sm font-medium">
                            {new Date(lead.convertedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {lead.campaign && (
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-2xs text-muted-foreground mb-1">Campaign</p>
                          <p className="text-sm font-medium">{lead.campaign.name}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-5">
                    <Timeline
                      groupByDay={false}
                      emptyLabel="No activities yet"
                      items={(lead.activities ?? []).map((activity: LeadActivity) => ({
                        id: String(activity.id),
                        icon: ACTIVITY_ICON[activity.type] ?? MapPin,
                        tone: ACTIVITY_TONE[activity.type] ?? "teal",
                        actor: activity.user?.name,
                        title: <span className="capitalize">{activity.type.replace("_", " ")}</span>,
                        body: (activity.subject || activity.notes || activity.outcome) ? (
                          <>
                            {activity.subject && <p className="text-xs">{activity.subject}</p>}
                            {activity.notes && <p className="mt-1 text-xs leading-relaxed text-foreground">{activity.notes}</p>}
                            {activity.outcome && <Badge variant="secondary" className="mt-2">{activity.outcome}</Badge>}
                          </>
                        ) : undefined,
                        timestamp: activity.date,
                      }))}
                    />
                  </TabsContent>

                  <TabsContent value="new-activity" className="mt-5">
                    <ActivityForm onSubmit={handleLogActivity} isPending={logActivity.isPending} />
                  </TabsContent>

                  <TabsContent value="follow-up" className="mt-4 space-y-5">
                    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                      <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                        <Plus className="h-3.5 w-3.5 text-brand-text" />
                        Schedule Follow-up
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-2xs text-muted-foreground">Title *</Label>
                          <Input
                            placeholder="e.g. Call to discuss SIP plan"
                            value={fuTitle}
                            onChange={(e) => setFuTitle(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground">Type</Label>
                          <Select value={fuType} onValueChange={(v) => setFuType(v as TaskType)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FOLLOW_UP_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value} className="text-xs">
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground">Time</Label>
                          <Input
                            type="time"
                            value={fuTime}
                            onChange={(e) => setFuTime(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <Label className="text-2xs text-muted-foreground">Date *</Label>
                          <DatePicker
                            value={fuDate}
                            onChange={setFuDate}
                            placeholder="Pick a date"
                            fromDate={new Date()}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <Label className="text-2xs text-muted-foreground">Notes (optional)</Label>
                          <Textarea
                            placeholder="Any context for this follow-up..."
                            value={fuNotes}
                            onChange={(e) => setFuNotes(e.target.value)}
                            rows={2}
                            className="text-xs resize-none"
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="w-full"
                        onClick={handleScheduleFollowUp}
                        loading={createTask.isPending}
                      >
                        {!createTask.isPending && <CalendarClock />}
                        Schedule Follow-up
                      </Button>
                    </div>

                    {pendingTasks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Pending ({pendingTasks.length})
                        </p>
                        <div className="space-y-2">
                          {pendingTasks.map((task) => {
                            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                            return (
                              <div
                                key={task.id}
                                className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/40"
                              >
                                <div className={cn(
                                  "h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                                  task.type === "CALL" ? "bg-info-soft text-info-strong" :
                                  task.type === "EMAIL" ? "bg-plum-soft text-plum-strong" :
                                  task.type === "MEETING" ? "bg-warning-soft text-warning-strong" :
                                  "bg-muted text-muted-foreground",
                                )}>
                                  {task.type === "CALL" ? <Phone className="h-3.5 w-3.5" /> :
                                   task.type === "EMAIL" ? <Mail className="h-3.5 w-3.5" /> :
                                   task.type === "MEETING" ? <Calendar className="h-3.5 w-3.5" /> :
                                   <Clock className="h-3.5 w-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium leading-tight">{task.title}</p>
                                  <p className={cn(
                                    "text-2xs mt-0.5",
                                    isOverdue ? "text-danger-strong font-medium" : "text-muted-foreground",
                                  )}>
                                    {formatTaskDue(task.dueDate)}
                                  </p>
                                  {task.notes && (
                                    <p className="text-2xs text-muted-foreground/70 mt-1 truncate">{task.notes}</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-success-strong"
                                  onClick={() => handleCompleteTask(task.id)}
                                  disabled={completeTask.isPending}
                                  title="Mark as done"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {doneTasks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Completed ({doneTasks.length})
                        </p>
                        <div className="space-y-1.5">
                          {doneTasks.slice(0, 5).map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/10 border border-border/20"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-success-strong shrink-0" />
                              <span className="text-2xs text-muted-foreground/70 line-through truncate flex-1">
                                {task.title}
                              </span>
                              <span className="text-2xs text-muted-foreground/50 shrink-0">
                                {task.completedAt
                                  ? new Date(task.completedAt).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" })
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingTasks.length === 0 && doneTasks.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">No follow-ups yet</p>
                        <p className="text-2xs mt-0.5">Schedule one above to stay on track</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
