"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  usePIPs,
  usePIPDetail,
  useCreatePIP,
  useUpdatePIP,
  useAcknowledgePIP,
  useCreatePIPCheckIn,
  usePIPDocuments,
  useAddPIPDocument,
  type PIP,
  type PIPGoal,
} from "@/lib/api/hooks/hr/pip";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Employee } from "@/types/hr";
import { PIP_CREATE_PREFILL_STORAGE_KEY, type PipCreatePrefillPayload } from "@/lib/hr/pip-prefill-storage";
import {
  createEmptyPipReason,
  normalizePipReasonEntries,
  PIP_MAX_REASONS,
  PIP_REASON_LABELS,
  type PipReasonCategory,
  type PipReasonEntry,
} from "@/lib/hr/pip-reasons";
import {
  validatePipForm,
  clampRatingInput,
  isWithinInclusive,
  employeeSelectOptions,
  type FieldErrors,
  type PipGoalInput,
} from "@/lib/hr/performance-validation";
import {
  PIP_PHASES,
  PIP_PHASE_LABELS,
  PIP_MANAGEMENT_DECISIONS,
  PIP_MANAGEMENT_DECISION_LABELS,
  MONITORING_PERIOD_DAYS,
  PIP_DOC_TYPES,
  PIP_DOC_TYPE_LABELS,
  type PipPhase,
  type PipManagementDecision,
  type PipDocType,
} from "@/lib/validations/hr-pip";

function isHrRepEligible(e: Employee): boolean {
  const dept = (e.department?.name ?? "").toLowerCase();
  const role = (e.role ?? "").toUpperCase();
  return (
    dept.includes("hr") ||
    dept.includes("human resource") ||
    dept.includes("people") ||
    role === "HR" ||
    role === "BRANCH_HR"
  );
}

type PipRow = {
  id: number;
  status: string | null;
  phase?: string | null;
  userId: string;
  startDate: string;
  endDate: string;
  user?: { name?: string | null } | null;
  goals?: { id: number; title: string }[];
};

function statusColor(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (!status) return "secondary";
  if (status === "COMPLETED") return "default";
  if (status === "ACTIVE" || status === "EXTENDED") return "outline";
  if (status === "TERMINATED") return "destructive";
  return "secondary";
}

function phaseIndex(phase: string | null | undefined): number {
  const idx = PIP_PHASES.indexOf((phase ?? "FORMAL_PIP") as PipPhase);
  return idx === -1 ? 2 : idx;
}

function emptyGoal(): PipGoalInput {
  return { title: "", successCriteria: "", deadline: "", description: "" };
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconWarning({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconEdit({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconFile({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function PhaseTimeline({ phase }: { phase: string | null | undefined }) {
  const current = phaseIndex(phase);
  const displayPhases = PIP_PHASES.filter((p) => p !== "CLOSED");
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {displayPhases.map((p, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        return (
          <div key={p} className="flex items-center min-w-0">
            <div className="flex flex-col items-center gap-0.5 min-w-[56px]">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0 ${
                  isDone
                    ? "bg-green-500 border-green-500 text-white"
                    : isCurrent
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {isDone ? <IconCheck className="h-3 w-3" /> : <span>{i + 1}</span>}
              </div>
              <span
                className={`text-[8px] text-center leading-tight max-w-[52px] ${
                  isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {PIP_PHASE_LABELS[p]}
              </span>
            </div>
            {i < displayPhases.length - 1 && (
              <div
                className={`h-0.5 w-4 shrink-0 mb-3 ${
                  i < current ? "bg-green-500" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PipTab() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const admin = isAdminOrOwner(role);

  const { data: pips, isLoading } = usePIPs();
  const createPip = useCreatePIP();
  const updatePip = useUpdatePIP();

  const [openId, setOpenId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const [userId, setUserId] = useState("");
  const [hrRepId, setHrRepId] = useState("");
  const [editPip, setEditPip] = useState<PIP | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [reasons, setReasons] = useState<PipReasonEntry[]>([createEmptyPipReason()]);
  const [evidence, setEvidence] = useState("");
  const [areas, setAreas] = useState("Productivity,Quality");
  const [goals, setGoals] = useState<PipGoalInput[]>([emptyGoal()]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reviewFrequency, setReviewFrequency] = useState<"WEEKLY" | "BI_WEEKLY" | "MONTHLY">("WEEKLY");
  const [reviewMethod, setReviewMethod] = useState("1:1 Meeting");
  const [expectedImprovement, setExpectedImprovement] = useState("Meet expectations consistently");
  const [consequences, setConsequences] = useState("Extension of PIP or performance escalation");
  const [monitoringPeriodDays, setMonitoringPeriodDays] = useState<30 | 60 | 90>(30);
  const [counselingNotes, setCounselingNotes] = useState("");
  const [counselingDate, setCounselingDate] = useState("");
  const [linkedAppraisalId, setLinkedAppraisalId] = useState<number | null>(null);

  const employeeOptions = useMemo(
    () => employeeSelectOptions(employees, hrRepId ? [hrRepId] : []),
    [employees, hrRepId]
  );
  const hrRepOptions = useMemo(
    () =>
      employeeSelectOptions(
        employees.filter((e) => isHrRepEligible(e)),
        userId ? [userId] : []
      ),
    [employees, userId]
  );

  const setUserIdSafe = useCallback((value: string) => {
    setUserId(value);
    setHrRepId((cur) => (cur === value ? "" : cur));
  }, []);
  const setHrRepIdSafe = useCallback((value: string) => {
    setHrRepId(value);
    setUserId((cur) => (cur === value ? "" : cur));
  }, []);

  useEffect(() => {
    if (!createOpen || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(PIP_CREATE_PREFILL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PipCreatePrefillPayload;
      if (parsed.userId) setUserId(parsed.userId);
      if (typeof parsed.linkedAppraisalId === "number") setLinkedAppraisalId(parsed.linkedAppraisalId);
      sessionStorage.removeItem(PIP_CREATE_PREFILL_STORAGE_KEY);
    } catch {
      sessionStorage.removeItem(PIP_CREATE_PREFILL_STORAGE_KEY);
    }
  }, [createOpen]);

  const list = (Array.isArray(pips) ? pips : []) as PipRow[];

  const resetForm = useCallback(() => {
    setUserId("");
    setHrRepId("");
    setReasons([createEmptyPipReason()]);
    setEvidence("");
    setAreas("Productivity,Quality");
    setGoals([emptyGoal()]);
    setStartDate("");
    setEndDate("");
    setReviewFrequency("WEEKLY");
    setReviewMethod("1:1 Meeting");
    setExpectedImprovement("Meet expectations consistently");
    setConsequences("Extension of PIP or performance escalation");
    setMonitoringPeriodDays(30);
    setCounselingNotes("");
    setCounselingDate("");
    setLinkedAppraisalId(null);
    setEditPip(null);
    setFormErrors({});
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setCreateOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((pip: PIP) => {
    setEditPip(pip);
    setUserId(pip.userId);
    setHrRepId(pip.hrRepId ?? "");
    setReasons(normalizePipReasonEntries(pip));
    setEvidence(pip.evidence ?? "");
    setAreas((pip.areasOfConcern ?? []).join(", "));
    setGoals(
      pip.goals?.length
        ? pip.goals.map((g) => ({ title: g.title, successCriteria: g.successCriteria, deadline: g.deadline, description: g.description ?? "" }))
        : [emptyGoal()]
    );
    setStartDate(pip.startDate);
    setEndDate(pip.endDate);
    setReviewFrequency((pip.reviewFrequency ?? "WEEKLY") as "WEEKLY" | "BI_WEEKLY" | "MONTHLY");
    setReviewMethod(pip.reviewMethod ?? "1:1 Meeting");
    setExpectedImprovement(pip.expectedImprovement ?? "");
    setConsequences(pip.consequencesIfNotMet ?? "");
    setMonitoringPeriodDays((pip.monitoringPeriodDays as 30 | 60 | 90) ?? 30);
    setCounselingNotes(pip.counselingNotes ?? "");
    setCounselingDate(pip.counselingDate ?? "");
    setLinkedAppraisalId(pip.linkedAppraisalId ?? null);
    setFormErrors({});
    setOpenId(null);
    setCreateOpen(true);
  }, []);

  const updateReason = useCallback((index: number, patch: Partial<PipReasonEntry>) => {
    setReasons((cur) => cur.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }, []);
  const addReason = useCallback(() => {
    setReasons((cur) => cur.length >= PIP_MAX_REASONS ? cur : [...cur, createEmptyPipReason()]);
  }, []);
  const removeReason = useCallback((index: number) => {
    setReasons((cur) => cur.length <= 1 ? cur : cur.filter((_, i) => i !== index));
  }, []);

  const updateGoal = useCallback((index: number, patch: Partial<PipGoalInput>) => {
    setGoals((cur) => cur.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }, []);
  const addGoal = useCallback(() => {
    setGoals((cur) => cur.length >= 10 ? cur : [...cur, emptyGoal()]);
  }, []);
  const removeGoal = useCallback((index: number) => {
    setGoals((cur) => cur.length <= 1 ? cur : cur.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    const errors = validatePipForm({
      userId,
      hrRepId,
      reasons,
      evidence,
      areas,
      goals: editPip ? (editPip.goals ?? []).map((g) => ({ title: g.title, successCriteria: g.successCriteria, deadline: g.deadline })) : goals,
      startDate,
      endDate,
      reviewMethod,
      expectedImprovement,
      consequences,
    });

    if (editPip) {
      const badGoal = (editPip.goals ?? []).some((g) => !isWithinInclusive(g.deadline, startDate, endDate));
      if (badGoal) errors.endDate = "New dates must still include every existing goal deadline.";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length) {
      toast.error(Object.values(errors)[0]);
      return;
    }

    const areasOfConcern = areas.split(",").map((s) => s.trim()).filter(Boolean);
    const normalizedReasons = reasons.map((e) => ({ category: e.category, description: e.description.trim() }));

    if (editPip) {
      updatePip.mutate(
        {
          id: editPip.id,
          reasons: normalizedReasons,
          evidence: evidence.trim(),
          areasOfConcern,
          startDate,
          endDate,
          reviewFrequency,
          reviewMethod: reviewMethod.trim(),
          expectedImprovement: expectedImprovement.trim(),
          consequencesIfNotMet: consequences.trim(),
          monitoringPeriodDays,
          counselingNotes: counselingNotes.trim() || undefined,
          counselingDate: counselingDate || null,
        },
        {
          onSuccess: () => { toast.success("PIP updated"); setCreateOpen(false); resetForm(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
      return;
    }

    createPip.mutate(
      {
        userId,
        hrRepId,
        reasons: normalizedReasons,
        evidence: evidence.trim(),
        areasOfConcern,
        goals: goals.map((g) => ({ title: g.title.trim(), successCriteria: g.successCriteria.trim(), deadline: g.deadline, description: g.description?.trim() || undefined })),
        startDate,
        endDate,
        reviewFrequency,
        reviewMethod: reviewMethod.trim(),
        expectedImprovement: expectedImprovement.trim(),
        consequencesIfNotMet: consequences.trim(),
        monitoringPeriodDays,
        counselingNotes: counselingNotes.trim() || undefined,
        counselingDate: counselingDate || null,
        linkedAppraisalId: linkedAppraisalId ?? undefined,
      },
      {
        onSuccess: () => { toast.success("PIP created — employee must acknowledge"); setCreateOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    userId, hrRepId, reasons, evidence, areas, goals, startDate, endDate,
    reviewFrequency, reviewMethod, expectedImprovement, consequences,
    monitoringPeriodDays, counselingNotes, counselingDate, linkedAppraisalId,
    editPip, createPip, updatePip, resetForm,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{list.length} PIPs</p>
        {admin && (
          <Button size="sm" onClick={openCreate}>
            <IconPlus className="h-3.5 w-3.5 mr-1" />
            New PIP
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <IconWarning className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No PIPs yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenId(p.id)}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.user?.name ?? p.userId}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.startDate} → {p.endDate} · {p.goals?.length ?? 0} goal{p.goals?.length === 1 ? "" : "s"}
                    {p.phase && p.phase !== "FORMAL_PIP" && (
                      <span className="ml-1">· {PIP_PHASE_LABELS[p.phase as PipPhase] ?? p.phase}</span>
                    )}
                  </p>
                </div>
                <Badge variant={statusColor(p.status)} className="shrink-0 text-[10px] font-normal">
                  {(p.status ?? "DRAFT").replace(/_/g, " ")}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit sheet */}
      <Sheet open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-3">
            <SheetTitle className="text-base">{editPip ? `Edit PIP #${editPip.id}` : "New PIP"}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-4 py-4 pb-8 text-sm">
              {linkedAppraisalId != null && (
                <p className="rounded-md border border-dashed border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  Linked to appraisal <strong className="text-foreground">#{linkedAppraisalId}</strong>
                </p>
              )}

              {/* Employee + HR Rep */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Employee *</Label>
                <SearchableSelect
                  options={employeeOptions}
                  value={userId}
                  onValueChange={setUserIdSafe}
                  placeholder="Select employee"
                  searchPlaceholder="Search employees…"
                  disabled={!!editPip}
                />
                {formErrors.userId && <p className="text-[11px] text-destructive">{formErrors.userId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">HR representative *</Label>
                <SearchableSelect
                  options={hrRepOptions}
                  value={hrRepId}
                  onValueChange={setHrRepIdSafe}
                  placeholder="Select HR user"
                  searchPlaceholder="Search HR team…"
                  emptyText="No HR department members found."
                  disabled={!!editPip}
                />
                <p className="text-[11px] text-muted-foreground">Only HR department members are listed.</p>
                {formErrors.hrRepId && <p className="text-[11px] text-destructive">{formErrors.hrRepId}</p>}
              </div>

              <Separator />

              {/* Pre-PIP counseling */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Initial Feedback (Pre-PIP)</p>
                <p className="text-[11px] text-muted-foreground">Document verbal counseling before the formal PIP, if applicable.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">Counseling date</Label>
                    <Input
                      type="date"
                      value={counselingDate}
                      max={startDate || undefined}
                      onChange={(e) => setCounselingDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">Counseling notes</Label>
                  <Textarea
                    rows={2}
                    className="text-xs"
                    maxLength={8000}
                    value={counselingNotes}
                    onChange={(e) => setCounselingNotes(e.target.value)}
                    placeholder="Notes from the verbal counseling session, improvement period outcome…"
                  />
                </div>
              </div>

              <Separator />

              {/* Reasons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Reasons *</Label>
                    <p className="text-[11px] text-muted-foreground">Up to {PIP_MAX_REASONS} reasons, each with a detailed description.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 text-xs"
                    onClick={addReason}
                    disabled={reasons.length >= PIP_MAX_REASONS}
                  >
                    <IconPlus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                {formErrors.reasons && <p className="text-[11px] text-destructive">{formErrors.reasons}</p>}
                <div className="space-y-3">
                  {reasons.map((entry, index) => (
                    <div key={index} className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">Reason {index + 1}</p>
                        {reasons.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeReason(index)}
                            aria-label={`Remove reason ${index + 1}`}
                          >
                            <IconTrash className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={entry.category}
                        onValueChange={(v) => updateReason(index, { category: v as PipReasonCategory })}
                      >
                        <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(PIP_REASON_LABELS) as [PipReasonCategory, string][]).map(([v, l]) => (
                            <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-medium text-muted-foreground">Description *</Label>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{entry.description.length}/2000</span>
                        </div>
                        <Textarea
                          rows={2}
                          className="text-xs"
                          maxLength={2000}
                          value={entry.description}
                          onChange={(e) => updateReason(index, { description: e.target.value })}
                          placeholder="Specific examples, dates, metrics…"
                        />
                        {formErrors[`reasons.${index}.description`] && (
                          <p className="text-[10px] text-destructive">{formErrors[`reasons.${index}.description`]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Evidence *</Label>
                <Textarea rows={2} className="text-sm" maxLength={8000} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Specific incidents, dates, KPI data, observation records…" />
                {formErrors.evidence && <p className="text-[11px] text-destructive">{formErrors.evidence}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Areas of concern *</Label>
                <Input
                  value={areas}
                  onChange={(e) => setAreas(e.target.value)}
                  placeholder="Productivity, Quality, Attendance…"
                />
                <p className="text-[10px] text-muted-foreground">Comma-separated list</p>
                {formErrors.areas && <p className="text-[11px] text-destructive">{formErrors.areas}</p>}
              </div>

              <Separator />

              {/* Goals */}
              {editPip ? (
                <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  Improvement goals cannot be edited after creation. Use check-ins to track progress.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Improvement Goals (SMART) *</Label>
                      <p className="text-[11px] text-muted-foreground">Add up to 10 goals with measurable success criteria.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={addGoal}
                      disabled={goals.length >= 10}
                    >
                      <IconPlus className="h-3 w-3 mr-1" />
                      Add goal
                    </Button>
                  </div>
                  {formErrors.goals && <p className="text-[11px] text-destructive">{formErrors.goals}</p>}
                  <div className="space-y-3">
                    {goals.map((goal, i) => (
                      <div key={i} className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">Goal {i + 1}</p>
                          {goals.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeGoal(i)}
                            >
                              <IconTrash className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Goal title *"
                          maxLength={120}
                          value={goal.title}
                          onChange={(e) => updateGoal(i, { title: e.target.value })}
                          className="text-xs h-8"
                        />
                        {formErrors[`goals.${i}.title`] && <p className="text-[10px] text-destructive">{formErrors[`goals.${i}.title`]}</p>}
                        <Textarea
                          placeholder="Success criteria — how will we know this goal is met? *"
                          className="text-xs"
                          rows={2}
                          maxLength={2000}
                          value={goal.successCriteria}
                          onChange={(e) => updateGoal(i, { successCriteria: e.target.value })}
                        />
                        {formErrors[`goals.${i}.successCriteria`] && <p className="text-[10px] text-destructive">{formErrors[`goals.${i}.successCriteria`]}</p>}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium text-muted-foreground">Deadline *</Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={goal.deadline}
                            min={startDate || undefined}
                            max={endDate || undefined}
                            onChange={(e) => updateGoal(i, { deadline: e.target.value })}
                          />
                          {formErrors[`goals.${i}.deadline`] && <p className="text-[10px] text-destructive">{formErrors[`goals.${i}.deadline`]}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Dates + monitoring */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">PIP start *</Label>
                  <Input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
                  {formErrors.startDate && <p className="text-[11px] text-destructive">{formErrors.startDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">PIP end *</Label>
                  <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
                  {formErrors.endDate && <p className="text-[11px] text-destructive">{formErrors.endDate}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Monitoring period</Label>
                <Select value={String(monitoringPeriodDays)} onValueChange={(v) => setMonitoringPeriodDays(Number(v) as 30 | 60 | 90)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONITORING_PERIOD_DAYS.map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Review frequency</Label>
                <Select value={reviewFrequency} onValueChange={(v) => setReviewFrequency(v as typeof reviewFrequency)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BI_WEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Review method *</Label>
                <Input value={reviewMethod} maxLength={200} onChange={(e) => setReviewMethod(e.target.value)} placeholder="1:1 Meeting, Video call…" />
                {formErrors.reviewMethod && <p className="text-[11px] text-destructive">{formErrors.reviewMethod}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Expected improvement *</Label>
                <Textarea rows={2} className="text-sm" maxLength={2000} value={expectedImprovement} onChange={(e) => setExpectedImprovement(e.target.value)} />
                {formErrors.expectedImprovement && <p className="text-[11px] text-destructive">{formErrors.expectedImprovement}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Consequences if not met *</Label>
                <Textarea rows={2} className="text-sm" maxLength={2000} value={consequences} onChange={(e) => setConsequences(e.target.value)} />
                {formErrors.consequences && <p className="text-[11px] text-destructive">{formErrors.consequences}</p>}
              </div>

              <Button className="w-full" onClick={handleSubmit} disabled={createPip.isPending || updatePip.isPending}>
                {editPip ? "Save changes" : "Create PIP"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-3">
            <SheetTitle className="text-base">PIP #{openId}</SheetTitle>
          </SheetHeader>
          {openId && (
            <PipDetailBody
              pipId={openId}
              sessionUserId={session?.user?.id}
              admin={admin}
              onClose={() => setOpenId(null)}
              onEdit={openEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PipDetailBody({
  pipId,
  sessionUserId,
  admin,
  onClose,
  onEdit,
}: {
  pipId: number;
  sessionUserId?: string;
  admin: boolean;
  onClose: () => void;
  onEdit: (pip: PIP) => void;
}) {
  const { data: detail, isLoading } = usePIPDetail(pipId);
  const { data: documents } = usePIPDocuments(pipId);
  const updatePip = useUpdatePIP();
  const acknowledge = useAcknowledgePIP();
  const addCheckIn = useCreatePIPCheckIn(pipId);
  const addDocument = useAddPIPDocument(pipId);

  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [showMidpointForm, setShowMidpointForm] = useState(false);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);

  const [ciDate, setCiDate] = useState(new Date().toISOString().split("T")[0]!);
  const [ciType, setCiType] = useState<"WEEKLY" | "BI_WEEKLY" | "MONTHLY">("WEEKLY");
  const [ciStatus, setCiStatus] = useState<"ON_TRACK" | "AT_RISK" | "NOT_MEETING">("ON_TRACK");
  const [ciManagerSummary, setCiManagerSummary] = useState("");
  const [ciManagerFeedback, setCiManagerFeedback] = useState("");
  const [ciEmployeeComments, setCiEmployeeComments] = useState("");
  const [ciImprovement, setCiImprovement] = useState<"IMPROVED" | "NO_CHANGE" | "DECLINED">("NO_CHANGE");
  const [ciRisk, setCiRisk] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [ciRating, setCiRating] = useState("");
  const [ciEscalation, setCiEscalation] = useState(false);
  const [ciEscalationNotes, setCiEscalationNotes] = useState("");
  const [ciGoalProgress, setCiGoalProgress] = useState<
    Record<number, { status: "ON_TRACK" | "AT_RISK" | "NOT_MEETING"; pct: string; done: string; next: string; blockers: string }>
  >({});

  const [midpointNotes, setMidpointNotes] = useState("");
  const [midpointOnTrack, setMidpointOnTrack] = useState<"yes" | "no">("yes");

  const [outcomeValue, setOutcomeValue] = useState<"SUCCESS" | "EXTENDED" | "FAILED">("SUCCESS");
  const [managementDecision, setManagementDecision] = useState<PipManagementDecision>("TERMINATION");
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const [docType, setDocType] = useState<PipDocType>("OBSERVATION_NOTES");
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");

  const row = detail as (PIP & {
    checkIns?: {
      id: number;
      checkInDate: string;
      checkInType: string;
      overallStatus: string;
      managerFeedback: string;
      summaryCommentsManager: string;
      summaryCommentsEmployee?: string | null;
      employeeSelfComments?: string | null;
      supportRequired?: string | null;
      managerRating: number | null;
      improvementSinceLast: string;
      riskLevel: string;
      escalationRequired?: boolean;
      escalationNotes?: string | null;
      goalProgressRows?: {
        id: number;
        progressStatus: string;
        percentComplete: number;
        workDone: string;
        blockers: string;
        nextSteps: string;
        goal?: { id: number; title: string } | null;
      }[];
    }[];
  }) | undefined;

  useEffect(() => {
    if (!row?.goals) return;
    const init: typeof ciGoalProgress = {};
    for (const g of row.goals) {
      init[g.id] = { status: "ON_TRACK", pct: "50", done: "", next: "", blockers: "" };
    }
    setCiGoalProgress(init);
  }, [row?.goals]);

  const handleAddCheckIn = useCallback(() => {
    if (!ciManagerSummary.trim()) { toast.error("Manager summary is required"); return; }
    if (!ciManagerFeedback.trim()) { toast.error("Manager feedback is required"); return; }
    if (!ciEmployeeComments.trim()) { toast.error("Employee self-comments are required"); return; }
    if (ciEscalation && !ciEscalationNotes.trim()) { toast.error("Escalation notes are required when escalation is flagged"); return; }
    const goals = row?.goals ?? [];
    if (goals.length === 0) { toast.error("PIP has no goals — cannot add check-in"); return; }
    const goalProgress = goals.map((g: PIPGoal) => {
      const gp = ciGoalProgress[g.id] ?? { status: "ON_TRACK" as const, pct: "50", done: "In progress", next: "Continue", blockers: "None" };
      return {
        pipGoalId: g.id,
        progressStatus: gp.status,
        percentComplete: Math.min(100, Math.max(0, parseInt(gp.pct || "0", 10))),
        workDone: gp.done.trim() || "In progress",
        blockers: gp.blockers.trim() || "None",
        nextSteps: gp.next.trim() || "Continue as planned",
      };
    });
    addCheckIn.mutate(
      {
        checkInDate: ciDate,
        checkInType: ciType,
        overallStatus: ciStatus,
        summaryCommentsManager: ciManagerSummary.trim(),
        summaryCommentsEmployee: null,
        managerFeedback: ciManagerFeedback.trim(),
        managerRating: ciRating ? parseInt(ciRating, 10) : null,
        improvementSinceLast: ciImprovement,
        employeeSelfComments: ciEmployeeComments.trim(),
        riskLevel: ciRisk,
        escalationRequired: ciEscalation,
        escalationNotes: ciEscalation ? ciEscalationNotes.trim() : null,
        goalProgress,
      },
      {
        onSuccess: () => {
          toast.success("Check-in recorded");
          setShowCheckInForm(false);
          setCiManagerSummary(""); setCiManagerFeedback(""); setCiEmployeeComments("");
          setCiEscalation(false); setCiEscalationNotes(""); setCiRating("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [ciDate, ciType, ciStatus, ciManagerSummary, ciManagerFeedback, ciEmployeeComments, ciImprovement, ciRisk, ciRating, ciEscalation, ciEscalationNotes, ciGoalProgress, row?.goals, addCheckIn]);

  const handleSaveMidpoint = useCallback(() => {
    if (!midpointNotes.trim()) { toast.error("Midpoint assessment notes are required"); return; }
    updatePip.mutate(
      { id: pipId, midpointAssessmentNotes: midpointNotes.trim(), midpointOnTrack: midpointOnTrack === "yes" },
      {
        onSuccess: () => { toast.success("Midpoint assessment saved"); setShowMidpointForm(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [pipId, midpointNotes, midpointOnTrack, updatePip]);

  const handleSetOutcome = useCallback(() => {
    if (outcomeValue === "FAILED" && !managementDecision) {
      toast.error("Select a management decision for not-met outcome");
      return;
    }
    updatePip.mutate(
      {
        id: pipId,
        finalOutcome: outcomeValue,
        managementDecision: outcomeValue === "FAILED" ? managementDecision : undefined,
        outcome: outcomeNotes.trim() || undefined,
      },
      {
        onSuccess: () => { toast.success("Outcome recorded"); setShowOutcomeForm(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [pipId, outcomeValue, managementDecision, outcomeNotes, updatePip]);

  const handleAddDocument = useCallback(() => {
    if (!docTitle.trim()) { toast.error("Document title is required"); return; }
    if (!docContent.trim()) { toast.error("Document content is required"); return; }
    addDocument.mutate(
      { docType, title: docTitle.trim(), content: docContent.trim() },
      {
        onSuccess: () => { toast.success("Document added"); setShowDocForm(false); setDocTitle(""); setDocContent(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [docType, docTitle, docContent, addDocument]);

  if (isLoading || !row) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const isEmployee = row.userId === sessionUserId;
  const canWrite = admin || row.managerId === sessionUserId || row.hrRepId === sessionUserId;
  const isActive = row.status === "ACTIVE" || row.status === "EXTENDED";
  const isClosed = row.status === "COMPLETED" || row.status === "TERMINATED";
  const currentPhase = (row.phase ?? "FORMAL_PIP") as PipPhase;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-4 px-4 py-4 pb-10 text-sm">

        {/* Phase timeline */}
        <div className="space-y-2">
          <PhaseTimeline phase={row.phase} />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusColor(row.status)} className="font-normal text-[10px]">
              {(row.status ?? "DRAFT").replace(/_/g, " ")}
            </Badge>
            {row.finalOutcome && (
              <Badge variant="outline" className="font-normal text-[10px]">
                {row.finalOutcome === "SUCCESS" ? "Fully Met" : row.finalOutcome === "EXTENDED" ? "Partially Met" : "Not Met"}
              </Badge>
            )}
            {row.managementDecision && (
              <Badge variant="destructive" className="font-normal text-[10px]">
                {PIP_MANAGEMENT_DECISION_LABELS[row.managementDecision]}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {row.startDate} → {row.endDate}
          {row.monitoringPeriodDays ? ` · ${row.monitoringPeriodDays}-day monitoring` : ""}
          {row.reviewFrequency ? ` · ${row.reviewFrequency.replace("_", "-").toLowerCase()} reviews` : ""}
          {row.reviewMethod ? ` via ${row.reviewMethod}` : ""}
        </p>

        {row.linkedAppraisalId && (
          <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Linked appraisal <strong className="text-foreground">#{row.linkedAppraisalId}</strong>
          </p>
        )}

        <Separator />

        {/* Pre-PIP counseling */}
        {(row.counselingDate || row.counselingNotes) && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Initial Counseling</p>
            <div className="rounded-md border bg-muted/20 px-3 py-2.5 space-y-1 text-xs">
              {row.counselingDate && (
                <p className="text-muted-foreground"><span className="font-medium text-foreground/80">Date: </span>{format(new Date(row.counselingDate), "MMM d, yyyy")}</p>
              )}
              {row.counselingNotes && (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{row.counselingNotes}</p>
              )}
            </div>
          </div>
        )}

        {/* Reasons */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Reasons for PIP</p>
          {normalizePipReasonEntries(row).map((entry, index) => (
            <div key={index} className="rounded-md border bg-muted/20 px-3 py-2.5 space-y-1.5">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {PIP_REASON_LABELS[entry.category]}
              </Badge>
              <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">{entry.description}</p>
            </div>
          ))}
        </div>

        {/* Areas of concern */}
        {(row.areasOfConcern ?? []).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Areas of concern</p>
            <div className="flex flex-wrap gap-1.5">
              {(row.areasOfConcern ?? []).map((a, i) => (
                <Badge key={i} variant="outline" className="text-[10px] font-normal">{a}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Evidence */}
        {row.evidence && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Evidence</p>
            <p className="text-xs leading-relaxed text-foreground/70 rounded-md border bg-muted/30 px-3 py-2 whitespace-pre-wrap">{row.evidence}</p>
          </div>
        )}

        <Separator />

        {/* Goals */}
        {(row.goals ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Improvement Goals (SMART)</p>
            {(row.goals ?? []).map((g: PIPGoal, idx) => (
              <div key={g.id} className="rounded-md border bg-card px-3 py-2.5 space-y-1 shadow-sm">
                <p className="text-xs font-medium">Goal {idx + 1}: {g.title}</p>
                {g.successCriteria && <p className="text-[11px] text-muted-foreground">{g.successCriteria}</p>}
                <p className="text-[10px] text-muted-foreground">Deadline: {g.deadline}</p>
              </div>
            ))}
          </div>
        )}

        {/* Expected + consequences */}
        {(row.expectedImprovement || row.consequencesIfNotMet) && (
          <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5 text-xs">
            {row.expectedImprovement && (
              <p><span className="font-medium">Expected: </span>{row.expectedImprovement}</p>
            )}
            {row.consequencesIfNotMet && (
              <p className="text-destructive/80"><span className="font-medium text-destructive">If not met: </span>{row.consequencesIfNotMet}</p>
            )}
          </div>
        )}

        <Separator />

        {/* Midpoint Assessment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Midpoint Assessment</p>
            {canWrite && isActive && !showMidpointForm && (
              <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => setShowMidpointForm(true)}>
                {row.midpointAssessmentNotes ? "Update" : "Record"}
              </Button>
            )}
          </div>
          {row.midpointAssessmentNotes ? (
            <div className="rounded-md border bg-muted/20 px-3 py-2.5 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status: </span>
                <Badge variant={row.midpointOnTrack ? "default" : "destructive"} className="text-[9px]">
                  {row.midpointOnTrack ? "On Track" : "Not On Track"}
                </Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">{row.midpointAssessmentNotes}</p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">No midpoint assessment yet.</p>
          )}
          {showMidpointForm && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-3 text-xs">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Employee on track?</Label>
                <Select value={midpointOnTrack} onValueChange={(v) => setMidpointOnTrack(v as "yes" | "no")}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes — on track</SelectItem>
                    <SelectItem value="no">No — additional coaching needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Assessment notes *</Label>
                <Textarea rows={3} className="text-xs" value={midpointNotes} onChange={(e) => setMidpointNotes(e.target.value)} placeholder="Summarize mid-period progress, achievements, and areas needing improvement…" maxLength={8000} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleSaveMidpoint} disabled={updatePip.isPending}>Save assessment</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowMidpointForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Check-ins */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Check-ins ({(row.checkIns ?? []).length})</p>
            {canWrite && (isActive || row.status === "DRAFT") && (
              <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => setShowCheckInForm((v) => !v)}>
                <IconPlus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>

          {(row.checkIns ?? []).length === 0 && !showCheckInForm && (
            <p className="text-[11px] text-muted-foreground italic">No check-ins recorded yet.</p>
          )}

          {(row.checkIns ?? []).map((ci) => (
            <div key={ci.id} className="rounded-md border bg-card px-3 py-2.5 space-y-1 text-xs shadow-sm">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium">{ci.checkInDate}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground">{ci.checkInType.replace("_", "-")}</span>
                  <span
                    className={
                      ci.overallStatus === "ON_TRACK"
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : ci.overallStatus === "AT_RISK"
                        ? "text-amber-600 dark:text-amber-400 font-medium"
                        : "text-destructive font-medium"
                    }
                  >
                    {ci.overallStatus.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              {ci.summaryCommentsManager && (
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground/80">Summary: </span>{ci.summaryCommentsManager}
                </p>
              )}
              {ci.managerFeedback && (
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground/80">Feedback: </span>{ci.managerFeedback}
                </p>
              )}
              {(ci.employeeSelfComments || ci.summaryCommentsEmployee) && (
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground/80">Employee: </span>
                  {ci.employeeSelfComments || ci.summaryCommentsEmployee}
                </p>
              )}
              {(ci.goalProgressRows ?? []).length > 0 && (
                <div className="space-y-1 rounded border bg-muted/40 px-2 py-1.5">
                  {(ci.goalProgressRows ?? []).map((gp) => (
                    <div key={gp.id} className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">{gp.goal?.title ?? "Goal"}: </span>
                      {gp.percentComplete}% · {gp.progressStatus.replace(/_/g, " ")}
                      {gp.blockers && gp.blockers !== "None" && <span> · {gp.blockers}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-0.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <IconClock className="h-2.5 w-2.5" />
                  {ci.improvementSinceLast.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] text-muted-foreground">Risk: {ci.riskLevel}</span>
                {ci.managerRating && <span className="text-[10px] text-muted-foreground">Rating: {ci.managerRating}/5</span>}
                {ci.escalationRequired && (
                  <Badge variant="destructive" className="text-[9px]">Escalated</Badge>
                )}
              </div>
            </div>
          ))}

          {showCheckInForm && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-3 text-xs">
              <p className="font-medium text-xs">New Check-in</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Date *</Label>
                  <Input type="date" value={ciDate} onChange={(e) => setCiDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Type</Label>
                  <Select value={ciType} onValueChange={(v) => setCiType(v as typeof ciType)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BI_WEEKLY">Bi-weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Overall status *</Label>
                  <Select value={ciStatus} onValueChange={(v) => setCiStatus(v as typeof ciStatus)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ON_TRACK">On track</SelectItem>
                      <SelectItem value="AT_RISK">At risk</SelectItem>
                      <SelectItem value="NOT_MEETING">Not meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Improvement since last</Label>
                  <Select value={ciImprovement} onValueChange={(v) => setCiImprovement(v as typeof ciImprovement)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IMPROVED">Improved</SelectItem>
                      <SelectItem value="NO_CHANGE">No change</SelectItem>
                      <SelectItem value="DECLINED">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Risk level</Label>
                  <Select value={ciRisk} onValueChange={(v) => setCiRisk(v as typeof ciRisk)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Manager rating (1–5)</Label>
                  <Input type="number" min={1} max={5} value={ciRating} onChange={(e) => setCiRating(clampRatingInput(e.target.value))} className="h-8 text-xs" placeholder="Optional" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Summary (manager) *</Label>
                <Textarea rows={2} className="text-xs" value={ciManagerSummary} onChange={(e) => setCiManagerSummary(e.target.value)} placeholder="What was discussed and reviewed…" maxLength={8000} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Manager feedback *</Label>
                <Textarea rows={2} className="text-xs" value={ciManagerFeedback} onChange={(e) => setCiManagerFeedback(e.target.value)} placeholder="Specific feedback and guidance given…" maxLength={8000} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Employee self-comments *</Label>
                <Textarea rows={2} className="text-xs" value={ciEmployeeComments} onChange={(e) => setCiEmployeeComments(e.target.value)} placeholder="Employee's own perspective and comments…" maxLength={8000} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="escalation-flag"
                  checked={ciEscalation}
                  onChange={(e) => setCiEscalation(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="escalation-flag" className="text-[10px] font-medium text-muted-foreground cursor-pointer">
                  Flag for escalation / formal warning
                </Label>
              </div>
              {ciEscalation && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Escalation notes *</Label>
                  <Textarea rows={2} className="text-xs" value={ciEscalationNotes} onChange={(e) => setCiEscalationNotes(e.target.value)} placeholder="Reason for escalation, next steps…" maxLength={4000} />
                </div>
              )}

              {/* Per-goal progress */}
              {(row.goals ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Goal progress *</p>
                  {(row.goals ?? []).map((g: PIPGoal) => {
                    const gp = ciGoalProgress[g.id] ?? { status: "ON_TRACK" as const, pct: "50", done: "", next: "", blockers: "" };
                    return (
                      <div key={g.id} className="rounded border bg-background px-2.5 py-2 space-y-1.5">
                        <p className="text-[10px] font-medium truncate">{g.title}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="space-y-1">
                            <Label className="text-[9px] text-muted-foreground">Status</Label>
                            <Select
                              value={gp.status}
                              onValueChange={(v) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, status: v as "ON_TRACK" | "AT_RISK" | "NOT_MEETING" } }))}
                            >
                              <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ON_TRACK">On track</SelectItem>
                                <SelectItem value="AT_RISK">At risk</SelectItem>
                                <SelectItem value="NOT_MEETING">Not meeting</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] text-muted-foreground">% complete</Label>
                            <Input
                              type="number" min={0} max={100} value={gp.pct}
                              onChange={(e) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, pct: e.target.value } }))}
                              className="h-6 text-[10px]"
                            />
                          </div>
                        </div>
                        <Input className="h-6 text-[10px]" placeholder="Work done *" value={gp.done} onChange={(e) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, done: e.target.value } }))} />
                        <Input className="h-6 text-[10px]" placeholder="Blockers (or 'None') *" value={gp.blockers} onChange={(e) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, blockers: e.target.value } }))} />
                        <Input className="h-6 text-[10px]" placeholder="Next steps *" value={gp.next} onChange={(e) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, next: e.target.value } }))} />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleAddCheckIn} disabled={addCheckIn.isPending}>Save check-in</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCheckInForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Key Documents */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Key Documents ({(documents ?? []).length})</p>
            {canWrite && !isClosed && (
              <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => setShowDocForm((v) => !v)}>
                <IconPlus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>

          {(documents ?? []).length === 0 && !showDocForm && (
            <p className="text-[11px] text-muted-foreground italic">No documents attached yet.</p>
          )}

          {(documents ?? []).map((doc) => (
            <div key={doc.id} className="rounded-md border bg-card px-3 py-2.5 space-y-1 text-xs shadow-sm">
              <div className="flex items-start gap-2">
                <IconFile className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{doc.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {PIP_DOC_TYPE_LABELS[doc.docType as PipDocType] ?? doc.docType}
                    {doc.uploader?.name ? ` · ${doc.uploader.name}` : ""}
                    {doc.createdAt ? ` · ${format(new Date(doc.createdAt), "MMM d, yyyy")}` : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-3">{doc.content}</p>
                </div>
              </div>
            </div>
          ))}

          {showDocForm && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-3 text-xs">
              <p className="font-medium">Add Document</p>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Document type</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as PipDocType)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIP_DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">{PIP_DOC_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Title *</Label>
                <Input className="h-8 text-xs" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} maxLength={200} placeholder="Document title…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Content *</Label>
                <Textarea rows={4} className="text-xs" value={docContent} onChange={(e) => setDocContent(e.target.value)} maxLength={50000} placeholder="Document content or notes…" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleAddDocument} disabled={addDocument.isPending}>Save document</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDocForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {canWrite && !isClosed && (
              <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                <IconEdit className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}

            {isEmployee && row.status === "DRAFT" && (
              <Button
                className="w-full"
                onClick={() =>
                  acknowledge.mutate(
                    { id: pipId, data: { acknowledged: true } },
                    {
                      onSuccess: () => { toast.success("PIP acknowledged — status now Active"); onClose(); },
                      onError: (e) => toast.error(getErrorMessage(e)),
                    }
                  )
                }
                disabled={acknowledge.isPending}
              >
                <IconCheck className="h-4 w-4 mr-2" />
                Acknowledge PIP
              </Button>
            )}
          </div>

          {/* Final outcome */}
          {admin && (isActive || row.status === "DRAFT") && (
            <div className="space-y-2">
              {!showOutcomeForm ? (
                <Button size="sm" variant="outline" className="w-full" onClick={() => setShowOutcomeForm(true)}>
                  Record Final Outcome
                </Button>
              ) : (
                <div className="rounded-md border bg-muted/30 p-3 space-y-3 text-xs">
                  <p className="font-medium">Final Performance Evaluation</p>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-muted-foreground">Outcome *</Label>
                    <Select value={outcomeValue} onValueChange={(v) => setOutcomeValue(v as typeof outcomeValue)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUCCESS">Fully Met Objectives — Exit PIP Successfully</SelectItem>
                        <SelectItem value="EXTENDED">Partially Met Objectives — Extend PIP (30–60 days)</SelectItem>
                        <SelectItem value="FAILED">Not Met Objectives — Management Decision</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {outcomeValue === "FAILED" && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-medium text-muted-foreground">Management decision *</Label>
                      <Select value={managementDecision} onValueChange={(v) => setManagementDecision(v as PipManagementDecision)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PIP_MANAGEMENT_DECISIONS.map((d) => (
                            <SelectItem key={d} value={d} className="text-xs">{PIP_MANAGEMENT_DECISION_LABELS[d]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-muted-foreground">Outcome notes</Label>
                    <Textarea rows={2} className="text-xs" value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} placeholder="Summary of final evaluation…" maxLength={4000} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={handleSetOutcome} disabled={updatePip.isPending}>
                      Confirm outcome
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowOutcomeForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase advancement (admin only) */}
          {admin && !isClosed && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Advance phase</p>
              <div className="flex flex-wrap gap-1.5">
                {currentPhase === "IDENTIFY" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => updatePip.mutate({ id: pipId, phase: "INITIAL_FEEDBACK", sufficientEvidence: true }, { onSuccess: () => toast.success("Phase updated"), onError: (e) => toast.error(getErrorMessage(e)) })}
                    disabled={updatePip.isPending}
                  >
                    Evidence sufficient → Initial Feedback
                  </Button>
                )}
                {currentPhase === "INITIAL_FEEDBACK" && (
                  <>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                      onClick={() => updatePip.mutate({ id: pipId, phase: "CLOSED", status: "COMPLETED", performanceImprovedCounseling: true }, { onSuccess: () => { toast.success("Case closed — performance improved"); onClose(); }, onError: (e) => toast.error(getErrorMessage(e)) })}
                      disabled={updatePip.isPending}
                    >
                      Performance improved → Close case
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                      onClick={() => updatePip.mutate({ id: pipId, phase: "FORMAL_PIP", performanceImprovedCounseling: false }, { onSuccess: () => toast.success("Moved to formal PIP"), onError: (e) => toast.error(getErrorMessage(e)) })}
                      disabled={updatePip.isPending}
                    >
                      No improvement → Formal PIP
                    </Button>
                  </>
                )}
                {currentPhase === "FORMAL_PIP" && row.acknowledgedAt && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                    onClick={() => updatePip.mutate({ id: pipId, phase: "MONITORING" }, { onSuccess: () => toast.success("Moved to monitoring"), onError: (e) => toast.error(getErrorMessage(e)) })}
                    disabled={updatePip.isPending}
                  >
                    PIP acknowledged → Start monitoring
                  </Button>
                )}
                {currentPhase === "MONITORING" && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                    onClick={() => updatePip.mutate({ id: pipId, phase: "EVALUATION" }, { onSuccess: () => toast.success("Moved to evaluation"), onError: (e) => toast.error(getErrorMessage(e)) })}
                    disabled={updatePip.isPending}
                  >
                    Monitoring complete → Final evaluation
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
