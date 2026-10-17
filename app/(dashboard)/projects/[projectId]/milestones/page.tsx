"use client";

import { Switch } from "@/components/ui/switch";
import { useOrgFeatureFlags } from "@/lib/api/hooks/ai";

import { use, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import { toneText, type Tone } from "@/lib/design/tones";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Diamond, Trash2, Pencil, CalendarCheck2 } from "lucide-react";
import {
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  type ProjectMilestone,
} from "@/lib/api/hooks/projects";
import { toast } from "sonner";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO } from "date-fns";
import { getTodayString } from "@/lib/date-utils";

const STATUS_CONFIG: Record<ProjectMilestone["status"], { label: string; tone: Tone; color: string }> = {
  PENDING: { label: "Pending", tone: "neutral", color: "text-muted-foreground" },
  ACHIEVED: { label: "Achieved", tone: "success", color: toneText.success },
  MISSED: { label: "Missed", tone: "danger", color: toneText.danger },
};

function MilestoneDialog({
  projectId,
  milestone,
  onClose,
}: {
  projectId: number;
  milestone?: ProjectMilestone;
  onClose: () => void;
}) {
  const isEdit = !!milestone;
  const [name, setName] = useState(milestone?.name ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [targetDate, setTargetDate] = useState(milestone?.targetDate ?? "");
  const [status, setStatus] = useState<ProjectMilestone["status"]>(milestone?.status ?? "PENDING");
  const [clientVisible, setClientVisible] = useState(!!milestone?.clientVisible);
  const portalOn = !!useOrgFeatureFlags().data?.clientPortal;

  const create = useCreateMilestone(projectId);
  const update = useUpdateMilestone(projectId);
  const isPending = create.isPending || update.isPending;

  const today = getTodayString();

  function handleSave() {
    if (!name.trim() || !targetDate) {
      toast.error("Name and target date are required");
      return;
    }
    if (isEdit) {
      update.mutate(
        { id: milestone.id, name: name.trim(), description: description.trim() || undefined, targetDate, status, ...(portalOn && { clientVisible }) },
        { onSuccess: () => { toast.success("Milestone updated"); onClose(); }, onError: () => toast.error("Failed to update") },
      );
    } else {
      create.mutate(
        { name: name.trim(), description: description.trim() || undefined, targetDate, status },
        { onSuccess: () => { toast.success("Milestone created"); onClose(); }, onError: () => toast.error("Failed to create") },
      );
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Milestone" : "New Milestone"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2">
          {/* Labels are tied to their inputs, and the date uses the same
              picker as every other form (QA-D012). */}
          <div className="space-y-1">
            <Label htmlFor="milestone-name">Name *</Label>
            <Input
              id="milestone-name"
              placeholder="e.g. MVP Launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea
              id="milestone-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="milestone-target-date">Target Date *</Label>
              <DatePicker
                id="milestone-target-date"
                value={targetDate}
                onChange={setTargetDate}
                fromDate={isEdit ? undefined : parseISO(today)}
                placeholder="Pick a target date"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="milestone-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectMilestone["status"])}>
                <SelectTrigger id="milestone-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACHIEVED">Achieved</SelectItem>
                  <SelectItem value="MISSED">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {portalOn && isEdit && (
            <label className="flex min-h-10 items-center justify-between gap-2 text-sm">
              Visible to client
              <Switch checked={clientVisible} onCheckedChange={setClientVisible} />
            </label>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={isPending} disabled={!name.trim() || !targetDate}>
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Milestone"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function MilestoneCard({
  milestone,
  onEdit,
  onDelete,
}: {
  milestone: ProjectMilestone;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_CONFIG[milestone.status];
  const dateObj = new Date(milestone.targetDate);
  const daysLeft = differenceInDays(dateObj, new Date());
  const overdue = isPast(dateObj) && !isToday(dateObj) && milestone.status === "PENDING";

  return (
    <Card className={cn("h-full", overdue && "border-danger-soft")}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Diamond
            className={cn("mt-0.5 size-5 shrink-0", cfg.color)}
            fill="currentColor"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" title={milestone.name}>{milestone.name}</p>
                {milestone.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{milestone.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <StatusPill tone={cfg.tone} dot>{cfg.label}</StatusPill>
              </div>
            </div>
            {/* MIYO-0114: how much of the release is done. */}
            {(milestone.ticketCount ?? 0) > 0 && (
              <div className="mt-2 space-y-1">
                <Progress
                  value={milestone.percentDone ?? 0}
                  aria-label={`${milestone.doneCount} of ${milestone.ticketCount} tickets done`}
                />
                <p className="text-2xs tabular-nums text-muted-foreground">
                  {milestone.doneCount}/{milestone.ticketCount} tickets done · {milestone.percentDone}%
                </p>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <CalendarCheck2 className="size-3.5" aria-hidden="true" />
                <span>{format(dateObj, "MMM d, yyyy")}</span>
                {milestone.status === "PENDING" && (
                  <span className={cn(overdue && "font-medium text-destructive")}>
                    {overdue
                      ? `${Math.abs(daysLeft)}d overdue`
                      : daysLeft === 0
                      ? "Today"
                      : `${daysLeft}d left`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon-xs" variant="ghost" onClick={onEdit} aria-label={`Edit ${milestone.name}`}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon-xs" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label={`Delete ${milestone.name}`}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MilestonesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const { data: milestones, isLoading, isError, error, refetch } = useProjectMilestones(projectId);
  const deleteMilestone = useDeleteMilestone(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectMilestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMilestone | null>(null);

  const achieved = milestones?.filter((m) => m.status === "ACHIEVED").length ?? 0;
  const total = milestones?.length ?? 0;

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMilestone.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Milestone deleted"); setDeleteTarget(null); },
      onError: () => toast.error("Failed to delete"),
    });
  }

  return (
    <PageWrapper
      title="Milestones"
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" /> New Milestone
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={refetch} />
      ) : milestones && milestones.length > 0 ? (
        <div className="space-y-6">
        <StatsStrip
          items={[
            { label: "Achieved", value: `${achieved}/${total}`, tone: "success" },
            { label: "Pending", value: milestones.filter((m) => m.status === "PENDING").length },
            { label: "Missed", value: milestones.filter((m) => m.status === "MISSED").length, tone: "danger" },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {milestones.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              onEdit={() => setEditTarget(m)}
              onDelete={() => setDeleteTarget(m)}
            />
          ))}
        </div>
        </div>
      ) : (
        <EmptyState
          icon={Diamond}
          title="No milestones yet"
          description="Add your first milestone to track key project dates."
          action={{ label: "Add first milestone", onClick: () => setCreateOpen(true) }}
        />
      )}

      {createOpen && (
        <MilestoneDialog projectId={projectId} onClose={() => setCreateOpen(false)} />
      )}
      {editTarget && (
        <MilestoneDialog
          projectId={projectId}
          milestone={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleDelete}
              disabled={deleteMilestone.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
