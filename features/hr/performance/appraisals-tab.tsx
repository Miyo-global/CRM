"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useAppraisals,
  useAppraisal,
  useAppraisalCategories,
  useCompleteAppraisalStage,
  useCreateAppraisal,
  usePatchAppraisalRatings,
  usePatchAppraisalMeta,
  useReopenAppraisal,
  useExportAppraisalPdf,
} from "@/lib/api/hooks/hr";
import { PIP_CREATE_PREFILL_STORAGE_KEY, type PipCreatePrefillPayload } from "@/lib/hr/pip-prefill-storage";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { clampRatingInput, employeeSelectOptions } from "@/lib/hr/performance-validation";
import {
  PlusIcon, RefreshIcon, AlertTriangleIcon as AlertIcon,
  DownloadIcon, StarIcon, CheckCircleIcon,
} from "@/components/ui/svg-icons";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Employee } from "@/types/hr";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { DatePicker } from "@/components/ui/date-picker";

type AppraisalStage =
  | "CYCLE_INITIATION" | "SELF_REVIEW" | "MANAGER_REVIEW" | "CEO_REVIEW"
  | "CALIBRATION" | "RATING_APPROVED" | "COMPENSATION_REVIEW" | "PROMOTION_REVIEW"
  | "FINAL_APPROVAL" | "DISCUSSION" | "EMPLOYEE_ACK" | "CLOSED";

const STAGE_ORDER: AppraisalStage[] = [
  "CYCLE_INITIATION", "SELF_REVIEW", "MANAGER_REVIEW", "CEO_REVIEW",
  "CALIBRATION", "RATING_APPROVED", "COMPENSATION_REVIEW", "PROMOTION_REVIEW",
  "FINAL_APPROVAL", "DISCUSSION", "EMPLOYEE_ACK", "CLOSED",
];

const STAGE_LABELS: Record<AppraisalStage, string> = {
  CYCLE_INITIATION: "Setup",
  SELF_REVIEW: "Self Review",
  MANAGER_REVIEW: "Manager Review",
  CEO_REVIEW: "Skip-Level",
  CALIBRATION: "Calibration",
  RATING_APPROVED: "Rating Approved",
  COMPENSATION_REVIEW: "Compensation",
  PROMOTION_REVIEW: "Promotion",
  FINAL_APPROVAL: "Approval",
  DISCUSSION: "Discussion",
  EMPLOYEE_ACK: "Acknowledged",
  CLOSED: "Closed",
};

const STAGE_COMPLETE_LABELS: Record<AppraisalStage, string> = {
  CYCLE_INITIATION: "Start appraisal",
  SELF_REVIEW: "Submit self-review",
  MANAGER_REVIEW: "Submit manager review",
  CEO_REVIEW: "Submit skip-level review",
  CALIBRATION: "Submit calibration",
  RATING_APPROVED: "Approve ratings",
  COMPENSATION_REVIEW: "Submit compensation review",
  PROMOTION_REVIEW: "Submit promotion review",
  FINAL_APPROVAL: "Approve & finalise",
  DISCUSSION: "Mark discussion done",
  EMPLOYEE_ACK: "Acknowledge & close",
  CLOSED: "Closed",
};

const RATING_SCALE = [
  { value: 5, label: "Exceptional", color: "text-success-strong" },
  { value: 4, label: "Exceeds Expectations", color: "text-teal-strong" },
  { value: 3, label: "Meets Expectations", color: "text-info-strong" },
  { value: 2, label: "Needs Improvement", color: "text-warning-strong" },
  { value: 1, label: "Unsatisfactory", color: "text-danger-strong" },
];

type AppraisalRow = {
  id: number;
  currentStage: string | null;
  overallRating: string | null;
  userId: string;
  reviewerId?: string | null;
  user?: { name?: string | null } | null;
  stages?: { id: number; stage: string; status: string; assigneeId: string | null; dueAt: string | null }[];
};

type CategoryRating = {
  id: number;
  categoryId: number;
  selfScore: string | null;
  selfText: string | null;
  managerScore: string | null;
  managerComment: string | null;
  category?: { id: number; name: string; ratingType: string } | null;
};

type AppraisalDetail = AppraisalRow & {
  categoryRatings?: CategoryRating[];
  outcomeNotes?: string | null;
  confidentialityNote?: string | null;
  calibratedRating?: string | null;
  hrCalibrationNotes?: string | null;
  proposedSalary?: string | null;
  salaryIncrementPct?: string | null;
  promotionRecommended?: boolean;
  proposedDesignation?: string | null;
  appraisalLetterUrl?: string | null;
  discussionScheduledAt?: string | null;
  discussionNotes?: string | null;
};

function AppraisalStepper({ currentStage, stages }: {
  currentStage: string | null;
  stages?: { stage: string; status: string }[];
}) {
  const completedSet = new Set((stages ?? []).filter(s => s.status === "COMPLETED").map(s => s.stage));
  const currentIdx = STAGE_ORDER.indexOf((currentStage ?? "CYCLE_INITIATION") as AppraisalStage);

  return (
    <div className="w-full overflow-x-auto py-1">
      <div className="flex items-start gap-0 min-w-max">
        {STAGE_ORDER.map((stage, i) => {
          const isCompleted = completedSet.has(stage) || (currentIdx > i);
          const isCurrent = stage === currentStage;
          const isPending = !isCompleted && !isCurrent;
          return (
            <div key={stage} className="flex items-start">
              <div className="flex flex-col items-center gap-1">
                <div className={`flex size-6 items-center justify-center rounded-full border-2 transition-colors ${
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                    ? "border-gold-400 bg-brand-soft text-brand-soft-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`} aria-current={isCurrent ? "step" : undefined}>
                  {isCompleted
                    ? <svg className="size-3" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : <span className="text-3xs font-bold">{i + 1}</span>
                  }
                </div>
                <span className={`text-3xs font-medium text-center leading-tight max-w-[52px] ${
                  isCurrent ? "font-semibold text-foreground" : isCompleted ? "text-brand-text" : "text-muted-foreground"
                }`}>
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {i < STAGE_ORDER.length - 1 && (
                <div className={`mt-3 h-0.5 w-5 shrink-0 ${isCompleted ? "bg-gold-400" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RatingScaleLegend() {
  return (
    <div className="space-y-1 rounded-md border border-border bg-surface-sunken/60 p-3">
      <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rating Scale</p>
      <div className="grid grid-cols-5 gap-1">
        {RATING_SCALE.map((r) => (
          <div key={r.value} className="flex flex-col items-center gap-0.5">
            <div className={`flex items-center gap-0.5 ${r.color}`}>
              {Array.from({ length: r.value }).map((_, i) => (
                <StarIcon key={i} className="size-2.5" filled />
              ))}
            </div>
            <span className="text-3xs text-center text-muted-foreground leading-tight">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppraisalsTab() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const admin = isAdminOrOwner(role);

  const [myOnly, setMyOnly] = useState(false);
  const { data: list, isLoading, isError, error, refetch } = useAppraisals(myOnly ? { myActions: true } : undefined);
  const { data: categories } = useAppraisalCategories();
  const [openId, setOpenId] = useState<number | null>(null);
  const { data: detail, isLoading: detailLoading } = useAppraisal(openId);
  const create = useCreateAppraisal();
  const patchRatings = usePatchAppraisalRatings(openId ?? 0);
  const patchMeta = usePatchAppraisalMeta(openId ?? 0);
  const completeStage = useCompleteAppraisalStage(openId ?? 0);
  const reopen = useReopenAppraisal();
  const exportPdf = useExportAppraisalPdf();

  const [createOpen, setCreateOpen] = useState(false);
  const [empId, setEmpId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [type, setType] = useState("ANNUAL");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");

  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );
  const employeeOptions = useMemo(() => employeeSelectOptions(employees), [employees]);
  const reviewerOptions = useMemo(
    () => [
      { value: "__auto__", label: "Auto (from reporting manager)" },
      ...employeeSelectOptions(employees, empId ? [empId] : []),
    ],
    [employees, empId]
  );

  const appraisalsList = (Array.isArray(list) ? list : []) as AppraisalRow[];
  const d = detail as AppraisalDetail | undefined;
  const catList = Array.isArray(categories) ? categories : [];

  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [calibratedRatingDraft, setCalibratedRatingDraft] = useState("");
  const [hrNotesDraft, setHrNotesDraft] = useState("");
  const [proposedSalaryDraft, setProposedSalaryDraft] = useState("");
  const [salaryIncrementDraft, setSalaryIncrementDraft] = useState("");
  const [promotionRecommendedDraft, setPromotionRecommendedDraft] = useState(false);
  const [proposedDesignationDraft, setProposedDesignationDraft] = useState("");
  const [discussionDateDraft, setDiscussionDateDraft] = useState("");
  const [discussionNotesDraft, setDiscussionNotesDraft] = useState("");

  useEffect(() => {
    setOutcomeDraft(d?.outcomeNotes ?? "");
    setCalibratedRatingDraft(d?.calibratedRating ?? "");
    setHrNotesDraft(d?.hrCalibrationNotes ?? "");
    setProposedSalaryDraft(d?.proposedSalary ?? "");
    setSalaryIncrementDraft(d?.salaryIncrementPct ?? "");
    setPromotionRecommendedDraft(d?.promotionRecommended ?? false);
    setProposedDesignationDraft(d?.proposedDesignation ?? "");
    setDiscussionDateDraft(
      d?.discussionScheduledAt ? new Date(d.discussionScheduledAt).toISOString().slice(0, 16) : ""
    );
    setDiscussionNotesDraft(d?.discussionNotes ?? "");
  }, [d, openId]);

  const canEditMeta = admin || (!!d && session?.user?.id === d.reviewerId);
  const canTriggerPip = !!d && d.currentStage === "CLOSED" && canEditMeta && !!d.userId;
  const hideManagerInputs =
    !!d && session?.user?.id === d.userId && !!d.currentStage && !["EMPLOYEE_ACK", "CLOSED"].includes(d.currentStage);

  const ratingDraft = useMemo(() => {
    const m = new Map<number, { selfScore?: string; selfText?: string; managerScore?: string; managerComment?: string }>();
    for (const r of d?.categoryRatings ?? []) {
      m.set(r.categoryId, {
        selfScore: r.selfScore ?? "",
        selfText: r.selfText ?? "",
        managerScore: r.managerScore ?? "",
        managerComment: r.managerComment ?? "",
      });
    }
    return m;
  }, [d?.categoryRatings]);

  const [localRatings, setLocalRatings] = useState<Map<number, { selfScore?: string; selfText?: string; managerScore?: string; managerComment?: string }>>(new Map());

  useEffect(() => {
    setLocalRatings(new Map(ratingDraft));
  }, [ratingDraft, openId]);

  const updateLocal = useCallback((categoryId: number, field: string, value: string) => {
    setLocalRatings((prev) => {
      const n = new Map(prev);
      const cur = { ...n.get(categoryId) };
      if (field === "selfScore") cur.selfScore = value;
      if (field === "selfText") cur.selfText = value;
      if (field === "managerScore") cur.managerScore = value;
      if (field === "managerComment") cur.managerComment = value;
      n.set(categoryId, cur);
      return n;
    });
  }, []);

  const handleSaveRatings = useCallback((mode: "self" | "manager") => {
    if (!openId || !d?.categoryRatings?.length) return;
    const ratings = d.categoryRatings.map((r) => {
      const loc = localRatings.get(r.categoryId) ?? {};
      const rt = r.category?.ratingType ?? "BOTH";
      const base = { categoryId: r.categoryId };
      if (mode === "self") {
        return { ...base, selfScore: rt === "TEXT" ? null : loc.selfScore ? Number(loc.selfScore) : null, selfText: loc.selfText ?? "" };
      }
      return { ...base, managerScore: rt === "TEXT" ? null : loc.managerScore ? Number(loc.managerScore) : null, managerComment: loc.managerComment ?? "" };
    });
    patchRatings.mutate({ ratings }, {
      onSuccess: () => toast.success("Ratings saved"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [openId, d, localRatings, patchRatings]);

  const handleCreate = useCallback(() => {
    if (!empId || !pStart || !pEnd) { toast.error("Employee and period are required"); return; }
    create.mutate(
      { userId: empId, reviewerId: reviewerId || undefined, type, periodStart: pStart, periodEnd: pEnd },
      {
        onSuccess: () => {
          toast.success("Appraisal created — employee can now fill self-review");
          setCreateOpen(false); setEmpId(""); setReviewerId(""); setPStart(""); setPEnd("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [empId, reviewerId, pStart, pEnd, type, create]);

  const handleCompleteStage = useCallback(() => {
    completeStage.mutate({}, {
      onSuccess: () => toast.success("Stage completed — next stage assigned"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [completeStage]);

  const handleSaveStageMeta = useCallback(() => {
    if (!d) return;
    const stage = d.currentStage as AppraisalStage;
    const payload: Parameters<typeof patchMeta.mutate>[0] = {};
    if (stage === "CALIBRATION") {
      if (!calibratedRatingDraft) { toast.error("Calibrated rating is required"); return; }
      payload.calibratedRating = Number(calibratedRatingDraft);
      payload.hrCalibrationNotes = hrNotesDraft || null;
    } else if (stage === "COMPENSATION_REVIEW") {
      if (proposedSalaryDraft) payload.proposedSalary = Number(proposedSalaryDraft);
      if (salaryIncrementDraft) payload.salaryIncrementPct = Number(salaryIncrementDraft);
    } else if (stage === "PROMOTION_REVIEW") {
      payload.promotionRecommended = promotionRecommendedDraft;
      payload.proposedDesignation = proposedDesignationDraft || null;
    } else if (stage === "DISCUSSION") {
      if (discussionDateDraft) payload.discussionScheduledAt = new Date(discussionDateDraft).toISOString();
      payload.discussionNotes = discussionNotesDraft || null;
    }
    payload.outcomeNotes = outcomeDraft || null;
    patchMeta.mutate(payload, {
      onSuccess: () => toast.success("Saved"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [d, calibratedRatingDraft, hrNotesDraft, proposedSalaryDraft, salaryIncrementDraft, promotionRecommendedDraft, proposedDesignationDraft, discussionDateDraft, discussionNotesDraft, outcomeDraft, patchMeta]);

  const canCompleteCurrentStage = useMemo(() => {
    if (!d?.currentStage || d.currentStage === "CLOSED") return false;
    if (admin) return true;
    return d.stages?.some((s) => s.stage === d.currentStage && s.status === "PENDING" && s.assigneeId === session?.user?.id) ?? false;
  }, [d, admin, session?.user?.id]);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>;
  }
  if (isError) return <QueryErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">{appraisalsList.length} appraisals</p>
        <div className="flex flex-wrap gap-2">
          <Button variant={myOnly ? "secondary" : "outline"} size="sm" aria-pressed={myOnly} onClick={() => setMyOnly((v) => !v)}>
            My actions
          </Button>
          {admin && (
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />New appraisal
            </Button>
          )}
        </div>
      </div>

      {admin && catList.length === 0 && (
        <div role="status" className="rounded-md border border-warning-500/30 bg-warning-soft px-3 py-2.5 text-xs text-warning-strong">
          No rating categories configured.{" "}
          <Link href="/settings/appraisal-categories" className="font-medium underline underline-offset-2">
            Set up appraisal categories
          </Link>{" "}
          before creating appraisals.
        </div>
      )}

      {appraisalsList.length === 0 ? (
        <EmptyState
          title="No appraisals yet."
          action={admin ? { label: "New appraisal", onClick: () => setCreateOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {appraisalsList.map((a) => {
            const stageIdx = STAGE_ORDER.indexOf((a.currentStage ?? "CYCLE_INITIATION") as AppraisalStage);
            const pct = Math.round(((stageIdx) / (STAGE_ORDER.length - 1)) * 100);
            return (
              <Card
                key={a.id}
                interactive
                role="button"
                tabIndex={0}
                className="focus-visible:focus-ring"
                onClick={() => setOpenId(a.id)}
                onKeyDown={(e) => { if (e.key === "Enter") setOpenId(a.id); }}
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words text-sm font-semibold text-foreground" title={a.user?.name ?? a.userId}>{a.user?.name ?? a.userId}</p>
                      <p className="font-mono text-xs text-muted-foreground">Appraisal #{a.id}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusPill tone={a.currentStage === "CLOSED" ? "success" : "brand"} dot>
                        {STAGE_LABELS[(a.currentStage ?? "CYCLE_INITIATION") as AppraisalStage]}
                      </StatusPill>
                      {a.overallRating && (
                        <p className="flex items-center justify-end gap-1 text-xs font-medium tabular-nums text-foreground">
                          <StarIcon className="size-3 text-brand-text" filled /> {Number(a.overallRating).toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gold-400 transition-[width] motion-reduce:transition-none" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">{pct}% complete</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent size="sm" className="flex h-full w-full flex-col gap-0 overflow-hidden p-0">
          <SheetHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12">
            <SheetTitle className="font-display text-lg">New appraisal</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-4 py-4 pb-8 text-sm">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Employee *</Label>
                <SearchableSelect options={employeeOptions} value={empId} onValueChange={setEmpId} placeholder="Select employee" searchPlaceholder="Search employees…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Reviewer / Manager</Label>
                <SearchableSelect options={reviewerOptions} value={reviewerId || "__auto__"} onValueChange={(v) => setReviewerId(v === "__auto__" ? "" : v)} placeholder="Auto (from reporting manager)" searchPlaceholder="Search employees…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["ANNUAL","SEMI_ANNUAL","QUARTERLY","MONTHLY","MID_YEAR","PROBATION_COMPLETION","CONFIRMATION","ONBOARDING","EXIT","PROMOTION","ROLE_CHANGE","SALARY_REVISION","PROJECT_COMPLETION","CRITICAL_INCIDENT","GOAL_BASED","TARGET_ACHIEVEMENT"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Period start *</Label>
                  <DatePicker value={pStart} onChange={setPStart} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Period end *</Label>
                  <DatePicker value={pEnd} onChange={setPEnd} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={create.isPending} loading={create.isPending}>Create appraisal</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent size="md" className="flex h-full w-full flex-col gap-0 overflow-hidden p-0">
          <SheetHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12">
            <SheetTitle className="font-display text-lg">{d?.user?.name ?? "Appraisal"} — <span className="font-mono text-base text-muted-foreground">#{openId}</span></SheetTitle>
          </SheetHeader>
          {detailLoading || !d ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3"><Skeleton className="h-16 w-full rounded-lg" /><Skeleton className="h-40 w-full rounded-lg" /></div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5 px-4 py-4 pb-10 text-sm">

                {/* Status Tracker */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Appraisal Progress</p>
                  <AppraisalStepper currentStage={d.currentStage} stages={d.stages} />
                </div>

                {/* Summary chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={d.currentStage === "CLOSED" ? "success" : "brand"} dot>{STAGE_LABELS[(d.currentStage ?? "CYCLE_INITIATION") as AppraisalStage]}</StatusPill>
                  {d.overallRating && <Badge variant="outline" className="tabular-nums"><StarIcon className="text-brand-text" filled />Rating {d.overallRating}</Badge>}
                  {d.calibratedRating && <StatusPill tone="info" className="tabular-nums">Calibrated {d.calibratedRating}</StatusPill>}
                  {d.promotionRecommended && <StatusPill tone="success"><CheckCircleIcon />Promotion recommended</StatusPill>}
                </div>

                <Separator />

                {/* Rating scale legend */}
                <RatingScaleLegend />

                {/* Category ratings */}
                {(d.categoryRatings ?? []).length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-surface-sunken/40 px-3 py-6 text-center text-xs text-muted-foreground">
                    No rating categories configured.{admin && " Set up appraisal categories to enable scoring."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ratings by Category</p>
                    {(d.categoryRatings ?? []).map((r) => {
                      const loc = localRatings.get(r.categoryId) ?? {};
                      const rt = r.category?.ratingType ?? "BOTH";
                      return (
                        <div key={r.id} className="space-y-3 rounded-md border border-border bg-card p-3 shadow-xs">
                          <p className="text-sm font-semibold leading-snug text-foreground">{r.category?.name}</p>
                          {(rt === "NUMERIC" || rt === "BOTH") && (
                            <div className={`grid gap-2 ${hideManagerInputs ? "grid-cols-1" : "sm:grid-cols-2"}`}>
                              <div>
                                <Label className="text-2xs">Self score (1–5)</Label>
                                <Input value={loc.selfScore ?? ""} onChange={(e) => updateLocal(r.categoryId, "selfScore", clampRatingInput(e.target.value))} type="number" min={1} max={5} />
                              </div>
                              {!hideManagerInputs && (
                                <div>
                                  <Label className="text-2xs">Manager score (1–5)</Label>
                                  <Input value={loc.managerScore ?? ""} onChange={(e) => updateLocal(r.categoryId, "managerScore", clampRatingInput(e.target.value))} type="number" min={1} max={5} />
                                </div>
                              )}
                            </div>
                          )}
                          {(rt === "TEXT" || rt === "BOTH") && (
                            <div className="space-y-1.5">
                              <Label className="text-2xs">Self comment</Label>
                              <Textarea rows={2} className="text-xs" value={loc.selfText ?? ""} onChange={(e) => updateLocal(r.categoryId, "selfText", e.target.value)} />
                              {!hideManagerInputs && (
                                <>
                                  <Label className="text-2xs">Manager comment</Label>
                                  <Textarea rows={2} className="text-xs" value={loc.managerComment ?? ""} onChange={(e) => updateLocal(r.categoryId, "managerComment", e.target.value)} />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* CALIBRATION stage panel */}
                {canCompleteCurrentStage && d.currentStage === "CALIBRATION" && (
                  <>
                    <Separator />
                    <div className="space-y-3 rounded-md border border-info-500/30 bg-info-soft/60 p-4">
                      <p className="text-xs font-semibold text-info-strong uppercase tracking-wider">HR Calibration</p>
                      <p className="text-xs text-muted-foreground">Review all manager scores for consistency and internal equity, then set the calibrated rating.</p>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Calibrated Rating (1–5) *</Label>
                        <div className="flex items-center gap-3">
                          <Input type="number" min={1} max={5} step={0.1} value={calibratedRatingDraft} onChange={(e) => setCalibratedRatingDraft(e.target.value)} className="w-24" />
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map((v) => (
                              <button key={v} type="button" aria-label={`${v} star${v === 1 ? "" : "s"}`} onClick={() => setCalibratedRatingDraft(String(v))} className="rounded-sm focus-visible:focus-ring">
                                <StarIcon className={`size-5 ${Number(calibratedRatingDraft) >= v ? "text-gold-400" : "text-ink-200"}`} filled={Number(calibratedRatingDraft) >= v} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Calibration Notes</Label>
                        <Textarea rows={3} className="text-xs" value={hrNotesDraft} onChange={(e) => setHrNotesDraft(e.target.value)} placeholder="Rating consistency observations, internal equity notes, policy compliance…" />
                      </div>
                    </div>
                  </>
                )}

                {/* RATING_APPROVED stage panel */}
                {canCompleteCurrentStage && d.currentStage === "RATING_APPROVED" && (
                  <>
                    <Separator />
                    <div className="space-y-3 rounded-md border border-info-500/30 bg-info-soft/60 p-4">
                      <p className="text-xs font-semibold text-info-strong uppercase tracking-wider">Rating Approval</p>
                      <p className="text-xs text-muted-foreground">Review the calibrated rating set by HR and approve it before compensation and promotion decisions are made.</p>
                      {d.calibratedRating && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Calibrated Rating:</span>
                          <StatusPill tone="brand" className="tabular-nums">
                            <StarIcon filled />{d.calibratedRating} / 5
                          </StatusPill>
                        </div>
                      )}
                      {d.hrCalibrationNotes && (
                        <div className="space-y-1">
                          <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">HR Calibration Notes</p>
                          <p className="rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground">{d.hrCalibrationNotes}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* COMPENSATION_REVIEW stage panel */}
                {canCompleteCurrentStage && d.currentStage === "COMPENSATION_REVIEW" && (
                  <>
                    <Separator />
                    <div className="space-y-3 rounded-md border border-success-500/30 bg-success-soft/60 p-4">
                      <p className="text-xs font-semibold text-success-strong uppercase tracking-wider">Compensation Review</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Proposed Salary (₹)</Label>
                          <Input type="number" min={0} value={proposedSalaryDraft} onChange={(e) => setProposedSalaryDraft(e.target.value)} placeholder="e.g. 800000" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Increment %</Label>
                          <Input type="number" min={0} max={100} step={0.5} value={salaryIncrementDraft} onChange={(e) => setSalaryIncrementDraft(e.target.value)} placeholder="e.g. 12" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* PROMOTION_REVIEW stage panel */}
                {canCompleteCurrentStage && d.currentStage === "PROMOTION_REVIEW" && (
                  <>
                    <Separator />
                    <div className="space-y-3 rounded-md border border-plum-500/30 bg-plum-soft/60 p-4">
                      <p className="text-xs font-semibold text-plum-strong uppercase tracking-wider">Promotion Eligibility Review</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={promotionRecommendedDraft} onChange={(e) => setPromotionRecommendedDraft(e.target.checked)} className="size-4 rounded-sm border-border-strong accent-primary" />
                        <span className="text-sm">Recommend for promotion</span>
                      </label>
                      {promotionRecommendedDraft && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Proposed New Designation</Label>
                          <Input value={proposedDesignationDraft} onChange={(e) => setProposedDesignationDraft(e.target.value)} placeholder="e.g. Senior Analyst" />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* DISCUSSION stage panel */}
                {canCompleteCurrentStage && d.currentStage === "DISCUSSION" && (
                  <>
                    <Separator />
                    <div className="space-y-3 rounded-md border border-warning-500/30 bg-warning-soft/60 p-4">
                      <p className="text-xs font-semibold text-warning-strong uppercase tracking-wider">Appraisal Discussion Meeting</p>
                      <p className="text-xs text-muted-foreground">Schedule and record the face-to-face discussion with the employee.</p>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Discussion Date &amp; Time</Label>
                        <Input type="datetime-local" value={discussionDateDraft} onChange={(e) => setDiscussionDateDraft(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Meeting Notes</Label>
                        <Textarea rows={3} className="text-xs" value={discussionNotesDraft} onChange={(e) => setDiscussionNotesDraft(e.target.value)} placeholder="Key discussion points, employee feedback, action items…" />
                      </div>
                    </div>
                  </>
                )}

                {/* Summary of compensation/promotion for non-assignees in later stages */}
                {(d.proposedSalary || d.promotionRecommended || d.calibratedRating) && ["RATING_APPROVED","FINAL_APPROVAL","DISCUSSION","EMPLOYEE_ACK","CLOSED"].includes(d.currentStage ?? "") && (
                  <>
                    <Separator />
                    <div className="space-y-2 rounded-md border border-border bg-surface-sunken/60 p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appraisal Summary</p>
                      {d.calibratedRating && (
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Calibrated Rating</span><span className="font-semibold tabular-nums">{d.calibratedRating} / 5</span></div>
                      )}
                      {d.proposedSalary && (
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Proposed Salary</span><span className="font-semibold tabular-nums">₹{Number(d.proposedSalary).toLocaleString(DEFAULT_LOCALE)}</span></div>
                      )}
                      {d.salaryIncrementPct && (
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Increment</span><span className="font-semibold tabular-nums">{d.salaryIncrementPct}%</span></div>
                      )}
                      {d.promotionRecommended && (
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Promotion</span><span className="font-semibold text-success-strong">{d.proposedDesignation ? `→ ${d.proposedDesignation}` : "Recommended"}</span></div>
                      )}
                      {d.discussionScheduledAt && (
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Discussion</span><span className="font-semibold tabular-nums">{format(new Date(d.discussionScheduledAt), "PPp")}</span></div>
                      )}
                    </div>
                  </>
                )}

                {/* Outcome notes */}
                {canEditMeta && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Outcome Notes</Label>
                      <Textarea rows={3} className="text-xs" value={outcomeDraft} onChange={(e) => setOutcomeDraft(e.target.value)} placeholder="Recommendations, final observations…" />
                    </div>
                  </>
                )}

                <Separator />

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {canCompleteCurrentStage && (d.categoryRatings ?? []).length > 0 && ["SELF_REVIEW","MANAGER_REVIEW","CEO_REVIEW"].includes(d.currentStage ?? "") && (
                    <Button size="sm" variant="secondary" onClick={() => handleSaveRatings(d.currentStage === "MANAGER_REVIEW" && session?.user?.id !== d.userId ? "manager" : "self")} disabled={patchRatings.isPending} loading={patchRatings.isPending}>
                      Save ratings
                    </Button>
                  )}

                  {canCompleteCurrentStage && ["CALIBRATION","COMPENSATION_REVIEW","PROMOTION_REVIEW","DISCUSSION"].includes(d.currentStage ?? "") && (
                    <Button size="sm" variant="secondary" onClick={handleSaveStageMeta} disabled={patchMeta.isPending} loading={patchMeta.isPending}>
                      Save
                    </Button>
                  )}

                  {canCompleteCurrentStage && d.currentStage !== "CLOSED" && (
                    <Button size="sm" onClick={handleCompleteStage} disabled={completeStage.isPending} loading={completeStage.isPending}>
                      {STAGE_COMPLETE_LABELS[(d.currentStage ?? "CYCLE_INITIATION") as AppraisalStage]}
                    </Button>
                  )}

                  {admin && d.currentStage === "CLOSED" && (
                    <Button size="sm" variant="outline" onClick={() => reopen.mutate(d.id, { onSuccess: () => toast.success("Appraisal reopened"), onError: (e) => toast.error(getErrorMessage(e)) })} disabled={reopen.isPending} loading={reopen.isPending}>
                      <RefreshIcon className="size-4" />Reopen
                    </Button>
                  )}

                  {canTriggerPip && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const payload: PipCreatePrefillPayload = { userId: d.userId, linkedAppraisalId: d.id };
                      try { sessionStorage.setItem(PIP_CREATE_PREFILL_STORAGE_KEY, JSON.stringify(payload)); } catch { /* noop */ }
                      router.replace("?tab=pip");
                      setOpenId(null);
                      toast.message("PIP tab opened — form is pre-filled.");
                    }}>
                      <AlertIcon className="size-4" />Trigger PIP
                    </Button>
                  )}

                  {canEditMeta && (
                    <Button size="sm" variant="outline" onClick={() => exportPdf.mutate(d.id, {
                      onSuccess: (blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = `appraisal-${d.id}.pdf`; a.click();
                        URL.revokeObjectURL(url);
                      },
                      onError: (e) => toast.error(getErrorMessage(e)),
                    })} disabled={exportPdf.isPending} loading={exportPdf.isPending}>
                      <DownloadIcon className="size-4" />Export PDF
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
