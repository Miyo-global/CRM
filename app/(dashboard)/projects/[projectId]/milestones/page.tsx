"use client";

import { use, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const STATUS_CONFIG = {
  PENDING: { label: "Pending", variant: "secondary" as const, color: "text-muted-foreground" },
  ACHIEVED: { label: "Achieved", variant: "default" as const, color: "text-green-600" },
  MISSED: { label: "Missed", variant: "destructive" as const, color: "text-red-600" },
} as const;

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

  const create = useCreateMilestone(projectId);
  const update = useUpdateMilestone(projectId);
  const isPending = create.isPending || update.isPending;

  const today = new Date().toISOString().slice(0, 10);

  function handleSave() {
    if (!name.trim() || !targetDate) {
      toast.error("Name and target date are required");
      return;
    }
    if (isEdit) {
      update.mutate(
        { id: milestone.id, name: name.trim(), description: description.trim() || undefined, targetDate, status },
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
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="e.g. MVP Launch" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Target Date *</Label>
              <Input type="date" min={isEdit ? undefined : today} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectMilestone["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACHIEVED">Achieved</SelectItem>
                  <SelectItem value="MISSED">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim() || !targetDate}>
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
    <Card className={overdue ? "border-destructive/40" : ""}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Diamond
            className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`}
            fill="currentColor"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{milestone.name}</p>
                {milestone.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{milestone.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                <span>{format(dateObj, "MMM d, yyyy")}</span>
                {milestone.status === "PENDING" && (
                  <span className={overdue ? "text-destructive font-medium" : ""}>
                    {overdue
                      ? `${Math.abs(daysLeft)}d overdue`
                      : daysLeft === 0
                      ? "Today"
                      : `${daysLeft}d left`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="h-3 w-3" />
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
  const { data: milestones, isLoading } = useProjectMilestones(projectId);
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
    <PageWrapper title="Milestones" subtitle="Key checkpoints and target dates for this project">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {achieved}/{total} achieved
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Milestone
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : milestones && milestones.length > 0 ? (
        <div className="space-y-3">
          {milestones.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              onEdit={() => setEditTarget(m)}
              onDelete={() => setDeleteTarget(m)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon={Diamond}
          title="No milestones yet"
          description="Add your first milestone to track key project dates."
          action={{ label: "Add first milestone", onClick: () => setCreateOpen(true) }}
          className="border-0 bg-transparent"
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
