"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useHiringFlows,
  useCreateHiringFlow,
  useUpdateHiringFlow,
  useDeleteHiringFlow,
  type HiringFlowRoundInput,
  type CreateHiringFlowInput,
} from "@/lib/api/hooks/hr/recruitment";
import type { HiringFlowTemplate, HiringFlowRound } from "@/types/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  HIRING_FLOW_LIMITS,
  hiringFlowFormSchema,
  mapHiringFlowFormErrors,
  type HiringFlowFormErrors,
} from "@/lib/validations/hiring-flow";
import { cn } from "@/lib/utils";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive mt-1">{message}</p>;
}

const ROUND_TYPES = [
  { value: "HR_SCREENING", label: "HR Screening" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "MANAGER", label: "Manager" },
  { value: "CULTURAL_FIT", label: "Cultural Fit" },
  { value: "FINAL", label: "Final Round" },
  { value: "CUSTOM", label: "Custom" },
];

const ROUND_MODES = [
  { value: "VIDEO", label: "Video Call" },
  { value: "PHONE", label: "Phone" },
  { value: "ONSITE", label: "On-site" },
];

function roundTypeBadgeColor(type: string) {
  switch (type) {
    case "HR_SCREENING": return "bg-blue-100 text-blue-700";
    case "TECHNICAL": return "bg-purple-100 text-purple-700";
    case "MANAGER": return "bg-orange-100 text-orange-700";
    case "CULTURAL_FIT": return "bg-green-100 text-green-700";
    case "FINAL": return "bg-red-100 text-red-700";
    default: return "bg-muted text-muted-foreground";
  }
}

const emptyRound = (): HiringFlowRoundInput & { _key: string } => ({
  _key: Math.random().toString(36).slice(2),
  roundOrder: 1,
  name: "",
  type: "TECHNICAL",
  mode: "VIDEO",
  slaDays: 3,
  durationMinutes: 60,
});

interface RoundRowProps {
  round: HiringFlowRoundInput & { _key: string };
  index: number;
  total: number;
  errors?: Partial<Record<"name" | "durationMinutes" | "slaDays" | "type" | "mode", string>>;
  onUpdate: (key: string, field: keyof HiringFlowRoundInput, value: string | number) => void;
  onRemove: (key: string) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
}

function RoundRow({ round, index, total, errors, onUpdate, onRemove, onMoveUp, onMoveDown }: RoundRowProps) {
  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            className={cn("text-muted-foreground hover:text-foreground transition-colors text-[10px] leading-none", index === 0 && "opacity-30 pointer-events-none")}
            onClick={() => onMoveUp(round._key)}
          >
            ▲
          </button>
          <button
            type="button"
            className={cn("text-muted-foreground hover:text-foreground transition-colors text-[10px] leading-none", index === total - 1 && "opacity-30 pointer-events-none")}
            onClick={() => onMoveDown(round._key)}
          >
            ▼
          </button>
        </div>
        <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">R{index + 1}</span>
        <Input
          className={cn("flex-1 h-8 text-xs", errors?.name && "border-destructive")}
          placeholder="Round name (e.g. Technical Interview)"
          value={round.name}
          maxLength={HIRING_FLOW_LIMITS.roundNameMax}
          aria-invalid={errors?.name ? true : undefined}
          onChange={(e) => onUpdate(round._key, "name", e.target.value)}
        />
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 text-destructive shrink-0", total <= 1 && "invisible")}
          onClick={() => onRemove(round._key)}
          type="button"
        >
          ×
        </Button>
      </div>
      {errors?.name ? <p className="text-[11px] text-destructive pl-9">{errors.name}</p> : null}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-9">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Type</Label>
          <Select value={round.type} onValueChange={(v) => onUpdate(round._key, "type", v)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUND_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Mode</Label>
          <Select value={round.mode ?? "VIDEO"} onValueChange={(v) => onUpdate(round._key, "mode", v)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUND_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Duration (min)</Label>
          <Input
            type="number"
            className={cn("h-7 text-xs", errors?.durationMinutes && "border-destructive")}
            min={HIRING_FLOW_LIMITS.durationMin}
            max={HIRING_FLOW_LIMITS.durationMax}
            value={round.durationMinutes ?? ""}
            aria-invalid={errors?.durationMinutes ? true : undefined}
            onChange={(e) =>
              onUpdate(
                round._key,
                "durationMinutes",
                e.target.value === "" ? Number.NaN : Number(e.target.value),
              )
            }
          />
          {errors?.durationMinutes ? (
            <p className="text-[10px] text-destructive">{errors.durationMinutes}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">SLA (days)</Label>
          <Input
            type="number"
            className={cn("h-7 text-xs", errors?.slaDays && "border-destructive")}
            min={HIRING_FLOW_LIMITS.slaMin}
            max={HIRING_FLOW_LIMITS.slaMax}
            value={round.slaDays ?? ""}
            aria-invalid={errors?.slaDays ? true : undefined}
            onChange={(e) =>
              onUpdate(
                round._key,
                "slaDays",
                e.target.value === "" ? Number.NaN : Number(e.target.value),
              )
            }
          />
          {errors?.slaDays ? (
            <p className="text-[10px] text-destructive">{errors.slaDays}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type SheetMode = "create" | "edit";

interface FlowSheetState {
  open: boolean;
  mode: SheetMode;
  template: HiringFlowTemplate | null;
}

function useFlowSheet() {
  const [state, setState] = useState<FlowSheetState>({ open: false, mode: "create", template: null });
  const openCreate = () => setState({ open: true, mode: "create", template: null });
  const openEdit = (t: HiringFlowTemplate) => setState({ open: true, mode: "edit", template: t });
  const close = () => setState((s) => ({ ...s, open: false }));
  return { state, openCreate, openEdit, close };
}

function toRoundInputs(rounds: HiringFlowRound[]): (HiringFlowRoundInput & { _key: string })[] {
  return rounds.map((r) => ({
    _key: String(r.id),
    roundOrder: r.roundOrder,
    name: r.name,
    type: r.type,
    mode: r.mode ?? "VIDEO",
    slaDays: r.slaDays ?? 3,
    durationMinutes: r.durationMinutes ?? 60,
    interviewerRole: r.interviewerRole ?? undefined,
    questionBankTag: r.questionBankTag ?? undefined,
    autoAdvanceThreshold: r.autoAdvanceThreshold ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

export default function HiringFlowsPage() {
  const { data: templates, isLoading } = useHiringFlows();
  const createMutation = useCreateHiringFlow();
  const deleteMutation = useDeleteHiringFlow();

  const { state: sheetState, openCreate, openEdit, close } = useFlowSheet();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [rounds, setRounds] = useState<(HiringFlowRoundInput & { _key: string })[]>([emptyRound()]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HiringFlowTemplate | null>(null);
  const [formErrors, setFormErrors] = useState<HiringFlowFormErrors>({});

  const updateMutation = useUpdateHiringFlow(sheetState.template?.id ?? 0);

  const clearFormErrors = useCallback(() => setFormErrors({}), []);

  function openCreateSheet() {
    setName("");
    setDescription("");
    setIsDefault(false);
    setRounds([emptyRound()]);
    clearFormErrors();
    openCreate();
  }

  function openEditSheet(t: HiringFlowTemplate) {
    setName(t.name);
    setDescription(t.description ?? "");
    setIsDefault(t.isDefault ?? false);
    setRounds(toRoundInputs(t.rounds));
    clearFormErrors();
    openEdit(t);
  }

  function updateRound(key: string, field: keyof HiringFlowRoundInput, value: string | number) {
    setRounds((prev) => {
      const idx = prev.findIndex((r) => r._key === key);
      if (idx >= 0) {
        setFormErrors((prevErrors) => {
          if (!prevErrors.roundByIndex?.[idx]?.[field as "name"]) return prevErrors;
          const nextRoundByIndex = { ...prevErrors.roundByIndex };
          const row = { ...nextRoundByIndex[idx] };
          delete row[field as keyof typeof row];
          if (Object.keys(row).length === 0) delete nextRoundByIndex[idx];
          else nextRoundByIndex[idx] = row;
          return { ...prevErrors, roundByIndex: nextRoundByIndex, rounds: undefined };
        });
      }
      return prev.map((r) => (r._key === key ? { ...r, [field]: value } : r));
    });
  }

  function removeRound(key: string) {
    setRounds((prev) => prev.filter((r) => r._key !== key).map((r, i) => ({ ...r, roundOrder: i + 1 })));
  }

  function addRound() {
    if (rounds.length >= HIRING_FLOW_LIMITS.maxRounds) {
      toast.error(`A hiring flow can have at most ${HIRING_FLOW_LIMITS.maxRounds} rounds.`);
      return;
    }
    setRounds((prev) => [...prev, { ...emptyRound(), roundOrder: prev.length + 1 }]);
  }

  function moveRound(key: string, dir: -1 | 1) {
    setRounds((prev) => {
      const idx = prev.findIndex((r) => r._key === key);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((r, i) => ({ ...r, roundOrder: i + 1 }));
    });
  }

  async function handleSave() {
    const payloadRounds = rounds.map(({ _key: _omit, ...r }, i) => ({
      ...r,
      roundOrder: i + 1,
    }));

    const parsed = hiringFlowFormSchema.safeParse({
      name,
      description,
      isDefault,
      rounds: payloadRounds,
    });

    if (!parsed.success) {
      const mapped = mapHiringFlowFormErrors(parsed.error.issues);
      setFormErrors(mapped);
      toast.error(parsed.error.issues[0]?.message ?? "Please fix the highlighted fields.");
      return;
    }

    clearFormErrors();

    const payload: CreateHiringFlowInput = {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      isDefault: parsed.data.isDefault,
      rounds: parsed.data.rounds,
    };

    setSaving(true);
    try {
      if (sheetState.mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success("Hiring flow created.");
      } else {
        await updateMutation.mutateAsync(payload);
        toast.success("Hiring flow updated.");
      }
      close();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Hiring flow deleted.");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <PageWrapper
      title="Hiring Flow Templates"
      subtitle="Define reusable interview round configurations per job posting."
      actions={
        <div className="flex items-center gap-2">
          <PageBackButton fallback="/hr/recruitment" />
          <Button size="sm" onClick={openCreateSheet}>
            New Flow
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !templates?.length ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration />}
          title="No hiring flows yet"
          description="Create a template to define the rounds of interviews for any job."
          action={{ label: "New Flow", onClick: openCreateSheet }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="group relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">{t.name}</CardTitle>
                    {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>}
                  </div>
                  {t.isDefault && <Badge className="shrink-0 text-[10px]">Default</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  {t.rounds.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                      <span className="font-medium truncate flex-1">{r.name}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", roundTypeBadgeColor(r.type))}>
                        {ROUND_TYPES.find((x) => x.value === r.type)?.label ?? r.type}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => openEditSheet(t)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={sheetState.open} onOpenChange={(v) => !v && close()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetState.mode === "create" ? "New Hiring Flow" : "Edit Hiring Flow"}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Engineering Standard Flow"
                value={name}
                maxLength={HIRING_FLOW_LIMITS.nameMax}
                aria-invalid={formErrors.name ? true : undefined}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formErrors.name) {
                    setFormErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
              />
              <FieldError message={formErrors.name} />
              <p className="text-[10px] text-muted-foreground">
                {name.trim().length}/{HIRING_FLOW_LIMITS.nameMax} characters (min {HIRING_FLOW_LIMITS.nameMin})
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                placeholder="Brief description of when to use this flow..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (formErrors.description) {
                    setFormErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                className="resize-none text-sm"
                rows={2}
                maxLength={HIRING_FLOW_LIMITS.descriptionMax}
                aria-invalid={formErrors.description ? true : undefined}
              />
              <FieldError message={formErrors.description} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is-default" checked={isDefault} onCheckedChange={setIsDefault} />
              <Label htmlFor="is-default" className="text-xs cursor-pointer">Set as default template</Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Interview Rounds <span className="text-destructive">*</span></Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={addRound}
                  type="button"
                  disabled={rounds.length >= HIRING_FLOW_LIMITS.maxRounds}
                >
                  + Add Round
                </Button>
              </div>
              <FieldError message={formErrors.rounds} />
              <div className="space-y-2">
                {rounds.map((r, i) => (
                  <RoundRow
                    key={r._key}
                    round={r}
                    index={i}
                    total={rounds.length}
                    errors={formErrors.roundByIndex?.[i]}
                    onUpdate={updateRound}
                    onRemove={removeRound}
                    onMoveUp={(k) => moveRound(k, -1)}
                    onMoveDown={(k) => moveRound(k, 1)}
                  />
                ))}
              </div>
            </div>
          </div>
          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : sheetState.mode === "create" ? "Create Flow" : "Save Changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hiring flow?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted. Jobs using this flow will keep their copied config.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
