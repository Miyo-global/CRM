"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Trash2, GripVertical, ListChecks, PlayCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useTaskSequences,
  useCreateTaskSequence,
  useDeleteTaskSequence,
  useApplyTaskSequence,
  type TaskSequence,
  type TaskEntityType,
} from "@/lib/api/hooks/tasks";
import { toast } from "sonner";

interface StepDraft {
  title: string;
  type: string;
  notes: string;
  offsetDays: number;
  order: number;
}

const TASK_TYPES = ["CALL", "EMAIL", "MEETING", "CUSTOM"] as const;


function ApplyDialog({
  sequence,
  onClose,
}: {
  sequence: TaskSequence;
  onClose: () => void;
}) {
  const [baseDate, setBaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [entityType, setEntityType] = useState<TaskEntityType | "">("");
  const [entityId, setEntityId] = useState("");
  const apply = useApplyTaskSequence();

  function handleApply() {
    if (!baseDate) return;
    apply.mutate(
      {
        sequenceId: sequence.id,
        input: {
          baseDate: new Date(baseDate).toISOString(),
          entityType: entityType !== "" ? entityType : undefined,
          entityId: entityId ? Number(entityId) : undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast.success(`Created ${data.count} task${data.count !== 1 ? "s" : ""} from "${sequence.name}"`);
          onClose();
        },
        onError: () => toast.error("Failed to apply sequence"),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply &ldquo;{sequence.name}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Base Date</Label>
            <Input
              type="date"
              value={baseDate}
              onChange={(e) => setBaseDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tasks will be scheduled at offsets from this date.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Link to Entity (optional)</Label>
            <Select
              value={entityType}
              onValueChange={(v) => setEntityType(v as TaskEntityType | "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="LEAD">Lead</SelectItem>
                <SelectItem value="DEAL">Deal</SelectItem>
                <SelectItem value="CONTACT">Contact</SelectItem>
                <SelectItem value="PROJECT">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {entityType && (
            <div className="space-y-1">
              <Label>Entity ID</Label>
              <Input
                type="number"
                placeholder="e.g. 42"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              />
            </div>
          )}
          <div className="rounded-md border p-3 text-sm space-y-1">
            <p className="font-medium">{sequence.steps.length} steps will be created:</p>
            {sequence.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs bg-muted rounded px-1">{step.offsetDays}d</span>
                <span>{step.title}</span>
                <Badge variant="secondary" className="text-xs">{step.type}</Badge>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={apply.isPending || !baseDate}>
            {apply.isPending ? "Creating…" : "Apply Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function CreateSequenceDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([
    { title: "", type: "CUSTOM", notes: "", offsetDays: 0, order: 0 },
  ]);
  const create = useCreateTaskSequence();

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        title: "",
        type: "CUSTOM",
        notes: "",
        offsetDays: prev.length > 0 ? (prev[prev.length - 1]?.offsetDays ?? 0) + 1 : 0,
        order: prev.length,
      },
    ]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: keyof StepDraft, value: string | number) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  }

  function handleCreate() {
    if (!name.trim() || steps.some((s) => !s.title.trim())) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        steps: steps.map((s, i) => ({
          title: s.title.trim(),
          type: s.type,
          notes: s.notes.trim() || undefined,
          offsetDays: s.offsetDays,
          order: i,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Sequence created");
          onClose();
        },
        onError: () => toast.error("Failed to create sequence"),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Task Sequence</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Sequence Name *</Label>
              <Input
                placeholder="e.g. 5-Touch Follow-Up"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Steps</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" /> Add Step
              </Button>
            </div>

            {steps.map((step, idx) => (
              <div key={idx} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground w-6">#{idx + 1}</span>
                  <Input
                    className="flex-1"
                    placeholder="Step title *"
                    value={step.title}
                    onChange={(e) => updateStep(idx, "title", e.target.value)}
                  />
                  <Select
                    value={step.type}
                    onValueChange={(v) => updateStep(idx, "type", v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 w-24">
                    <Input
                      type="number"
                      min={0}
                      className="w-16 text-center"
                      value={step.offsetDays}
                      onChange={(e) => updateStep(idx, "offsetDays", Number(e.target.value))}
                    />
                    <span className="text-xs text-muted-foreground">d</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    disabled={steps.length <= 1}
                    onClick={() => removeStep(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  className="text-sm min-h-0 h-8 resize-none"
                  placeholder="Optional notes"
                  value={step.notes}
                  onChange={(e) => updateStep(idx, "notes", e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={create.isPending || !name.trim() || steps.some((s) => !s.title.trim())}
          >
            {create.isPending ? "Creating…" : "Create Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function SequenceCard({
  sequence,
  onApply,
  onDelete,
}: {
  sequence: TaskSequence;
  onApply: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{sequence.name}</CardTitle>
            {sequence.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{sequence.description}</p>
            )}
          </div>
          <Badge variant="secondary">{sequence.steps.length} steps</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {sequence.steps.slice(0, 5).map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-sm">
              <span className="text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground min-w-[2.5rem] text-center">
                +{step.offsetDays}d
              </span>
              <span className="flex-1 truncate">{step.title}</span>
              <Badge variant="outline" className="text-xs">{step.type}</Badge>
            </div>
          ))}
          {sequence.steps.length > 5 && (
            <p className="text-xs text-muted-foreground pl-1">
              +{sequence.steps.length - 5} more steps
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1" onClick={onApply}>
            <PlayCircle className="h-4 w-4 mr-1" /> Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


export default function TaskSequencesPage() {
  const { data: sequences, isLoading } = useTaskSequences();
  const deleteSeq = useDeleteTaskSequence();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<TaskSequence | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskSequence | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteSeq.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Sequence deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete sequence"),
    });
  }

  return (
    <PageWrapper title="Task Sequences" subtitle="Pre-built task chains for repeatable workflows">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ListChecks className="h-5 w-5" />
          <span className="text-sm">{sequences?.length ?? 0} sequence{sequences?.length !== 1 ? "s" : ""}</span>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Sequence
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : sequences && sequences.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              sequence={seq}
              onApply={() => setApplyTarget(seq)}
              onDelete={() => setDeleteTarget(seq)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon={ListChecks}
          title="No sequences yet"
          description="Create a sequence to chain repeatable tasks for your workflows."
          action={{ label: "Create your first sequence", onClick: () => setCreateOpen(true) }}
          className="border-0 bg-transparent"
        />
      )}

      {createOpen && <CreateSequenceDialog onClose={() => setCreateOpen(false)} />}
      {applyTarget && (
        <ApplyDialog sequence={applyTarget} onClose={() => setApplyTarget(null)} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sequence?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted. Tasks already created from it will not be affected.
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
