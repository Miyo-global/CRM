"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useHrPerformanceReviews,
  useHrGoals,
  useReviewCycles,
  useCreateReviewCycle,
  useUpdateReviewCycle,
  useDeleteReviewCycle,
  useCreatePerformanceReview,
  useUpdatePerformanceReview,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useOneOnOneMeetings,
  useCreateOneOnOne,
  useUpdateOneOnOne,
  useDeleteOneOnOne,
  useHrEmployees,
  type OneOnOneMeetingWithParticipants,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import type { Tone } from "@/lib/design/tones";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { useOrgSettings } from "@/lib/api/hooks/organization";
import {
  REVIEW_CYCLE_TYPES,
  REVIEW_CYCLE_TYPE_MAP,
  addMonthsEndDate,
  sanitizeTargetValueInput,
  employeeSelectOptions,
  localDateTimeToIso,
  formatMeetingDateTime,
  validateReviewCycleForm,
  validateReviewForm,
  validateGoalForm,
  validateMeetingForm,
  type FieldErrors,
} from "@/lib/hr/performance-validation";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { AIGenerateReviewButton } from "@/features/hr/performance/ai-generate-review-button";
import { AppraisalsTab } from "@/features/hr/performance/appraisals-tab";
import { PipTab } from "@/features/hr/performance/pip-tab";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { ALL_ROLES } from "@/lib/constants/roles";
import { toast } from "sonner";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import {
  PlusIcon as Plus, StarIcon as Star, TargetIcon as Target, UsersIcon as Users,
  CalendarIcon as Calendar, ClockIcon as Clock, MoreHorizontalIcon as MoreHorizontal,
  CheckCircleIcon as CheckCircle2, TrashIcon as Trash2, PencilIcon as Pencil,
  ClipboardListIcon as ClipboardList, AlertTriangleIcon as AlertTriangle,
} from "@/components/ui/svg-icons";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Employee, PerformanceReview, Goal, ReviewCycle, MeetingStatus } from "@/types/hr";
import { plural } from "@/lib/format-utils";
import { DatePicker } from "@/components/ui/date-picker";
import { parseCalendarDate } from "@/lib/date-utils";

const REVIEW_TONE: Record<string, Tone> = { COMPLETED: "success", IN_PROGRESS: "info" };
const CYCLE_TONE: Record<string, Tone> = { ACTIVE: "success", COMPLETED: "neutral" };
const MEETING_TONE: Record<string, Tone> = { COMPLETED: "success", CANCELLED: "danger", SCHEDULED: "info" };

function TabHeader({ count, children }: { count: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground tabular-nums">{count}</p>
      {children}
    </div>
  );
}

function ListSkeleton({ count, className }: { count: number; className: string }) {
  return <div className="space-y-3">{Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={className} />)}</div>;
}

export default function PerformancePage() {
  return (
    <DashboardGate allowedRoles={[...ALL_ROLES]}>
      <PerformanceContent />
    </DashboardGate>
  );
}

function PerformanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "reviews";

  const handleTabChange = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "reviews") params.delete("tab");
    else params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <PageWrapper title="Performance">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="underline" className="max-w-full overflow-x-auto">
          <TabsTrigger value="reviews"><Star className="size-4" />Reviews</TabsTrigger>
          <TabsTrigger value="appraisals"><ClipboardList className="size-4" />Appraisals</TabsTrigger>
          <TabsTrigger value="pip"><AlertTriangle className="size-4" />PIP</TabsTrigger>
          <TabsTrigger value="goals"><Target className="size-4" />Goals</TabsTrigger>
          <TabsTrigger value="one-on-ones"><Users className="size-4" />1-on-1s</TabsTrigger>
          <TabsTrigger value="cycles"><Calendar className="size-4" />Cycles</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="mt-4"><ReviewsTab /></TabsContent>
        <TabsContent value="appraisals" className="mt-4"><AppraisalsTab /></TabsContent>
        <TabsContent value="pip" className="mt-4"><PipTab /></TabsContent>
        <TabsContent value="goals" className="mt-4"><GoalsTab /></TabsContent>
        <TabsContent value="one-on-ones" className="mt-4"><OneOnOnesTab /></TabsContent>
        <TabsContent value="cycles" className="mt-4"><CyclesTab /></TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

function ReviewsTab() {
  const { data: reviews, isLoading, isError, error, refetch } = useHrPerformanceReviews();
  const { data: employeesRaw } = useHrEmployees();
  const { data: cycles } = useReviewCycles();
  const createReview = useCreatePerformanceReview();
  const updateReview = useUpdatePerformanceReview();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [cycleId, setCycleId] = useState("none");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [formErrors, setFormErrors] = useState<FieldErrors>({});

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );
  const employeeOptions = useMemo(
    () => employeeSelectOptions(employees),
    [employees]
  );
  const selectedEmployee = useMemo(() => employees.find((e) => e.id === employeeId), [employees, employeeId]);
  const selectedCycle = useMemo(
    () => (cycleId !== "none" ? cycles?.find((c: ReviewCycle) => String(c.id) === cycleId) : undefined),
    [cycles, cycleId]
  );
  const minStart = useMemo(
    () =>
      [selectedEmployee?.joiningDate, selectedCycle?.periodStart]
        .filter(Boolean)
        .sort()
        .pop() as string | undefined,
    [selectedEmployee, selectedCycle]
  );
  const maxEnd = selectedCycle?.periodEnd ?? undefined;

  const resetForm = useCallback(() => {
    setEmployeeId("");
    setCycleId("none");
    setPeriodStart("");
    setPeriodEnd("");
    setFormErrors({});
  }, []);

  const handleCycleChange = useCallback((value: string) => {
    setCycleId(value);
    if (value !== "none") {
      const c = cycles?.find((x: ReviewCycle) => String(x.id) === value);
      if (c?.periodStart) setPeriodStart(c.periodStart);
      if (c?.periodEnd) setPeriodEnd(c.periodEnd);
    }
  }, [cycles]);

  const handleCreate = useCallback(() => {
    const errors = validateReviewForm({
      employeeId,
      periodStart,
      periodEnd,
      joiningDate: selectedEmployee?.joiningDate,
      cycleStart: selectedCycle?.periodStart,
      cycleEnd: selectedCycle?.periodEnd,
    });
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      toast.error(Object.values(errors)[0]);
      return;
    }
    createReview.mutate({
      userId: employeeId,
      cycleId: cycleId !== "none" ? Number(cycleId) : undefined,
      periodStart,
      periodEnd,
    }, {
      onSuccess: () => {
        toast.success("Review created");
        setSheetOpen(false);
        resetForm();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [employeeId, cycleId, periodStart, periodEnd, selectedEmployee, selectedCycle, createReview, resetForm]);

  const handleComplete = useCallback((id: number) => {
    updateReview.mutate({ id, status: "COMPLETED" }, {
      onSuccess: () => toast.success("Review marked as completed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateReview]);

  if (isLoading) {
    return <ListSkeleton count={4} className="h-20 w-full rounded-lg" />;
  }
  if (isError) return <QueryErrorState error={error} onRetry={() => void refetch()} />;

  const reviewsList = Array.isArray(reviews) ? reviews : [];

  return (
    <div className="space-y-4">
      <TabHeader count={plural(reviewsList.length, "review")}>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" />New Review
        </Button>
      </TabHeader>

      {reviewsList.length === 0 ? (
        <EmptyState
          title="No performance reviews yet"
          action={{ label: "New Review", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {reviewsList.map((review: PerformanceReview) => (
            <Card key={review.id}>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <StatusPill tone={REVIEW_TONE[review.status ?? ""] ?? "neutral"} dot>
                    {review.status ?? "DRAFT"}
                  </StatusPill>
                  {review.overallRating && (
                    <div className="flex items-center gap-1 text-brand-text">
                      <Star className="size-3.5 fill-current" />
                      <span className="font-display text-sm font-bold tabular-nums">{Number(review.overallRating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarImage src={resolveImageUrl(review.user?.image ?? null)} />
                    <AvatarFallback className="bg-brand-soft text-2xs text-brand-soft-foreground">{review.user?.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    {/* Two lines with the full text on hover, not one cut-off line (BUG-30). */}
                    <p className="line-clamp-2 break-words text-sm font-semibold text-foreground" title={review.user?.name ?? undefined}>{review.user?.name ?? "Employee"}</p>
                    <p
                      className="line-clamp-2 break-words text-xs text-muted-foreground tabular-nums"
                      title={`${review.periodStart} → ${review.periodEnd}${review.reviewer?.name ? ` · by ${review.reviewer.name}` : ""}`}
                    >
                      {review.periodStart} → {review.periodEnd}
                      {review.reviewer?.name && <> &middot; by {review.reviewer.name}</>}
                    </p>
                  </div>
                </div>
                {review.status !== "COMPLETED" && (
                  <Button variant="outline" size="xs" className="mt-auto w-full" onClick={() => handleComplete(review.id)} disabled={updateReview.isPending} loading={updateReview.isPending && updateReview.variables?.id === review.id}>
                    <CheckCircle2 />Mark Complete
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) resetForm(); }} title="Create review" onSubmit={handleCreate} submitLabel="Create" isPending={createReview.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <SearchableSelect
            options={employeeOptions}
            value={employeeId}
            onValueChange={setEmployeeId}
            placeholder="Select employee"
            searchPlaceholder="Search employees…"
          />
          {formErrors.employeeId && <p className="text-2xs text-destructive">{formErrors.employeeId}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Review Cycle (optional)</label>
          <Select value={cycleId} onValueChange={handleCycleChange}>
            <SelectTrigger><SelectValue placeholder="Ad-hoc review" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ad-hoc (no cycle)</SelectItem>
              {cycles?.map((c: ReviewCycle) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCycle && (
            <p className="text-2xs text-muted-foreground">
              Inherits {selectedCycle.periodStart} → {selectedCycle.periodEnd}. Dates must stay within this range.
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period Start</label>
            <Input type="date" value={periodStart} min={minStart} max={periodEnd || maxEnd} onChange={(e) => setPeriodStart(e.target.value)} />
            {formErrors.periodStart && <p className="text-2xs text-destructive">{formErrors.periodStart}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period End</label>
            <Input type="date" value={periodEnd} min={periodStart || minStart} max={maxEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            {formErrors.periodEnd && <p className="text-2xs text-destructive">{formErrors.periodEnd}</p>}
          </div>
        </div>
        {employeeId && periodStart && periodEnd && (
          <div className="border-t border-border pt-3">
            <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-2">AI Assist</p>
            <AIGenerateReviewButton
              userId={employeeId}
              userName={employees.find((e) => e.id === employeeId)?.name ?? "Employee"}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          </div>
        )}
      </HrSheet>
    </div>
  );
}

function GoalsTab() {
  const { data: goals, isLoading, isError, error, refetch } = useHrGoals();
  const { data: employeesRaw } = useHrEmployees();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formErrors, setFormErrors] = useState<FieldErrors>({});

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );
  const employeeOptions = useMemo(
    () => employeeSelectOptions(employees),
    [employees]
  );

  const resetForm = useCallback(() => {
    setUserId("");
    setTitle("");
    setDescription("");
    setTargetValue("");
    setStartDate("");
    setEndDate("");
    setFormErrors({});
  }, []);

  const handleCreate = useCallback(() => {
    const errors = validateGoalForm({ userId, title, description, targetValue, startDate, endDate });
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      toast.error(Object.values(errors)[0]);
      return;
    }
    createGoal.mutate({
      userId,
      title: title.trim(),
      description: description.trim() || undefined,
      targetValue: targetValue.trim() ? Number(targetValue) : undefined,
      currentValue: 0,
      startDate,
      endDate,
    }, {
      onSuccess: () => {
        toast.success("Goal created");
        setSheetOpen(false);
        resetForm();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [userId, title, description, targetValue, startDate, endDate, createGoal, resetForm]);

  const handleProgressUpdate = useCallback((goalId: number, progress: number) => {
    const newProgress = Math.min(100, Math.max(0, progress));
    updateGoal.mutate({ goalId, progress: newProgress, status: newProgress >= 100 ? "COMPLETED" : "IN_PROGRESS" }, {
      onSuccess: () => toast.success("Progress updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateGoal]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteGoal.mutate(deleteId, {
      onSuccess: () => { toast.success("Goal deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteGoal]);

  if (isLoading) {
    return <ListSkeleton count={4} className="h-20 w-full rounded-lg" />;
  }
  if (isError) return <QueryErrorState error={error} onRetry={() => void refetch()} />;

  const goalsList = Array.isArray(goals) ? goals : [];

  return (
    <div className="space-y-4">
      <TabHeader count={`${goalsList.length} goals`}>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" />New Goal
        </Button>
      </TabHeader>

      {goalsList.length === 0 ? (
        <EmptyState
          title="No goals set yet."
          action={{ label: "New Goal", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {goalsList.map((goal: Goal) => (
            <Card key={goal.id}>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <StatusPill tone={goal.status === "COMPLETED" ? "success" : "info"} dot>
                    {(goal.status ?? "IN_PROGRESS").replace("_", " ")}
                  </StatusPill>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Goal actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleProgressUpdate(goal.id, (goal.progress ?? 0) + 10)}>+10% Progress</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleProgressUpdate(goal.id, 100)}>Mark Complete</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(goal.id)}><Trash2 />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="line-clamp-2 break-words text-sm font-semibold leading-tight text-foreground" title={goal.title}>{goal.title}</p>
                {goal.endDate && <p className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums"><Calendar className="size-3.5" />Due {format(parseCalendarDate(goal.endDate), "MMM d, yyyy")}</p>}
                <div className="mt-auto space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium tabular-nums text-foreground">{goal.progress ?? 0}%</span>
                  </div>
                  <Progress value={goal.progress ?? 0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) resetForm(); }} title="Create goal" onSubmit={handleCreate} submitLabel="Create" isPending={createGoal.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <SearchableSelect
            options={employeeOptions}
            value={userId}
            onValueChange={setUserId}
            placeholder="Select employee"
            searchPlaceholder="Search employees…"
          />
          {formErrors.userId && <p className="text-2xs text-destructive">{formErrors.userId}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Title</label>
            <span className="text-2xs text-muted-foreground tabular-nums">{title.length}/120</span>
          </div>
          <Input placeholder="e.g., Complete Q2 OKRs" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          {formErrors.title && <p className="text-2xs text-destructive">{formErrors.title}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Description</label>
            <span className="text-2xs text-muted-foreground tabular-nums">{description.length}/2000</span>
          </div>
          <Textarea placeholder="Goal details..." value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} rows={3} />
          {formErrors.description && <p className="text-2xs text-destructive">{formErrors.description}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Target Value</label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="100"
            value={targetValue}
            onChange={(e) => setTargetValue(sanitizeTargetValueInput(e.target.value))}
          />
          {formErrors.targetValue && <p className="text-2xs text-destructive">{formErrors.targetValue}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date</label>
            <Input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
            {formErrors.startDate && <p className="text-2xs text-destructive">{formErrors.startDate}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
            {formErrors.endDate && <p className="text-2xs text-destructive">{formErrors.endDate}</p>}
          </div>
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete goal"
        description="Are you sure you want to delete this goal? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteGoal.isPending}
      />
    </div>
  );
}

function OneOnOnesTab() {
  const { data: meetings, isLoading, isError, error, refetch } = useOneOnOneMeetings();
  const { data: employeesRaw } = useHrEmployees();
  const createMeeting = useCreateOneOnOne();
  const updateMeeting = useUpdateOneOnOne();
  const deleteMeeting = useDeleteOneOnOne();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [empId, setEmpId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [agenda, setAgenda] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [formErrors, setFormErrors] = useState<FieldErrors>({});

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );
  const employeeOptions = useMemo(
    () => employeeSelectOptions(employees),
    [employees]
  );
  const participantOptions = useMemo(
    () => employeeOptions.filter((o) => o.value !== empId),
    [employeeOptions, empId]
  );
  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) map.set(e.id, e);
    return map;
  }, [employees]);
  const resolveParticipants = useCallback(
    (m: OneOnOneMeetingWithParticipants) => {
      if (m.additionalParticipantUsers?.length) return m.additionalParticipantUsers;
      return (m.additionalParticipants ?? [])
        .map((id) => {
          const e = employeeById.get(id);
          return e ? { id: e.id, name: e.name, image: e.image } : null;
        })
        .filter((p): p is { id: string; name: string | null; image: string | null } => Boolean(p));
    },
    [employeeById]
  );

  const resetForm = useCallback(() => {
    setEmpId("");
    setParticipantIds([]);
    setScheduledDate("");
    setScheduledTime("10:00");
    setDuration("30");
    setAgenda("");
    setMeetingLink("");
    setFormErrors({});
  }, []);

  const handleEmployeeChange = useCallback((value: string) => {
    setEmpId(value);
    setParticipantIds((prev) => prev.filter((id) => id !== value));
  }, []);

  const handleCreate = useCallback(() => {
    const errors = validateMeetingForm({ employeeId: empId, date: scheduledDate, time: scheduledTime, duration, meetingLink, agenda });
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      toast.error(Object.values(errors)[0]);
      return;
    }
    const scheduledAt = localDateTimeToIso(scheduledDate, scheduledTime);
    if (!scheduledAt) {
      toast.error("Invalid date or time");
      return;
    }
    const target = new Date(scheduledAt).getTime();
    const clash = (meetings ?? []).some(
      (m: OneOnOneMeetingWithParticipants) =>
        m.employee?.id === empId &&
        m.status !== "CANCELLED" &&
        new Date(m.scheduledAt).getTime() === target
    );
    if (clash) {
      toast.error("This employee already has a meeting at that date and time.");
      return;
    }
    createMeeting.mutate(
      {
        employeeId: empId,
        scheduledAt,
        duration: Number(duration) || 30,
        agenda: agenda.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
        additionalParticipantIds: participantIds.filter((id) => id !== empId),
      },
      {
        onSuccess: () => {
          toast.success("Meeting scheduled — calendar invite sent");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [empId, participantIds, scheduledDate, scheduledTime, duration, agenda, meetingLink, meetings, createMeeting, resetForm]);

  const handleStatusChange = useCallback((id: number, status: MeetingStatus) => {
    updateMeeting.mutate({ id, status }, {
      onSuccess: () => toast.success("Status updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateMeeting]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMeeting.mutate(deleteId, {
      onSuccess: () => { toast.success("Meeting deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteMeeting]);

  if (isLoading) {
    return <ListSkeleton count={3} className="h-16 w-full rounded-lg" />;
  }
  if (isError) return <QueryErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <TabHeader count={`${meetings?.length ?? 0} meetings`}>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" />Schedule 1-on-1
        </Button>
      </TabHeader>

      {!meetings?.length ? (
        <EmptyState
          title="No 1-on-1 meetings scheduled."
          action={{ label: "Schedule 1-on-1", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="space-y-2">
          {meetings.map((m: OneOnOneMeetingWithParticipants) => {
            const participants = resolveParticipants(m);
            return (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                <div className="flex shrink-0 -space-x-2">
                  <Avatar className="size-7 border-2 border-card">
                    <AvatarImage src={resolveImageUrl(m.manager?.image ?? null)} />
                    <AvatarFallback className="bg-brand-soft text-3xs text-brand-soft-foreground">{m.manager?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <Avatar className="size-7 border-2 border-card">
                    <AvatarImage src={resolveImageUrl(m.employee?.image ?? null)} />
                    <AvatarFallback className="bg-brand-soft text-3xs text-brand-soft-foreground">{m.employee?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  {participants.slice(0, 3).map((p) => (
                    <Avatar key={p.id} className="size-7 border-2 border-card">
                      <AvatarImage src={resolveImageUrl(p.image ?? null)} />
                      <AvatarFallback className="bg-neutral-soft text-3xs text-neutral-strong">{p.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                  ))}
                  {participants.length > 3 && (
                    <span className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-neutral-soft text-3xs font-semibold tabular-nums text-neutral-strong">
                      +{participants.length - 3}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-sm font-semibold text-foreground" title={`${m.manager?.name ?? ""} & ${m.employee?.name ?? ""}`}>{m.manager?.name} & {m.employee?.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    <Clock className="size-3.5" />
                    {formatMeetingDateTime(String(m.scheduledAt))} &middot; {m.duration}min
                  </p>
                  {participants.length > 0 && (
                    <p className="flex items-start gap-1 text-xs text-muted-foreground">
                      <Users className="mt-px size-3.5 shrink-0" />
                      <span className="line-clamp-2 break-words" title={participants.map((p) => p.name ?? "Participant").join(", ")}>
                        with {participants.map((p) => p.name ?? "Participant").join(", ")}
                      </span>
                    </p>
                  )}
                </div>
                <StatusPill tone={MEETING_TONE[m.status ?? ""] ?? "neutral"} dot className="shrink-0">
                  {m.status}
                </StatusPill>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Meeting actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {m.status === "SCHEDULED" && <DropdownMenuItem onClick={() => handleStatusChange(m.id, "COMPLETED")}>Mark Completed</DropdownMenuItem>}
                    {m.status === "SCHEDULED" && <DropdownMenuItem onClick={() => handleStatusChange(m.id, "CANCELLED")}>Cancel</DropdownMenuItem>}
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(m.id)}><Trash2 />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) resetForm(); }} title="Schedule 1-on-1" onSubmit={handleCreate} submitLabel="Schedule" isPending={createMeeting.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <SearchableSelect
            options={employeeOptions}
            value={empId}
            onValueChange={handleEmployeeChange}
            placeholder="Select team member"
            searchPlaceholder="Search employees…"
          />
          {formErrors.employeeId && <p className="text-2xs text-destructive">{formErrors.employeeId}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Additional participants (optional)</label>
          <SearchableMultiSelect
            options={participantOptions}
            values={participantIds}
            onValuesChange={setParticipantIds}
            placeholder="Add others to this 1-on-1"
            searchPlaceholder="Search teammates…"
            selectedLabel={(count) => `${count} participant${count === 1 ? "" : "s"}`}
          />
          <p className="text-2xs text-muted-foreground">
            They are added to the calendar (.ics) invite and emailed alongside the manager and employee.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <DatePicker value={scheduledDate} onChange={setScheduledDate} />
            {formErrors.date && <p className="text-2xs text-destructive">{formErrors.date}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time</label>
            <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            {formErrors.time && <p className="text-2xs text-destructive">{formErrors.time}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration (min)</label>
          <Input type="number" min={15} max={180} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
          {formErrors.duration && <p className="text-2xs text-destructive">{formErrors.duration}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Meeting link (optional)</label>
          <Input
            type="url"
            placeholder="https://meet.google.com/… · Zoom · Teams"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
          {formErrors.meetingLink && <p className="text-2xs text-destructive">{formErrors.meetingLink}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Agenda</label>
          <Textarea placeholder="Topics to discuss..." value={agenda} maxLength={1000} onChange={(e) => setAgenda(e.target.value)} rows={3} />
          {formErrors.agenda && <p className="text-2xs text-destructive">{formErrors.agenda}</p>}
        </div>
        <p className="text-2xs text-muted-foreground">
          The employee receives an email with a calendar (.ics) invite they can add to Google Calendar, Outlook, or Apple Calendar.
        </p>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete meeting"
        description="Delete this 1-on-1 meeting?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteMeeting.isPending}
      />
    </div>
  );
}

function CyclesTab() {
  const { data: cycles, isLoading, isError, error, refetch } = useReviewCycles();
  const { data: org } = useOrgSettings();
  const createCycle = useCreateReviewCycle();
  const updateCycle = useUpdateReviewCycle();
  const deleteCycle = useDeleteReviewCycle();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<ReviewCycle | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("QUARTERLY");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [deadline, setDeadline] = useState("");
  const [formErrors, setFormErrors] = useState<FieldErrors>({});

  const orgStartDate = useMemo(
    () => (org?.createdAt ? String(org.createdAt).slice(0, 10) : undefined),
    [org?.createdAt]
  );
  const typeInfo = REVIEW_CYCLE_TYPE_MAP[type];

  const applyTypePeriod = useCallback((nextType: string, start: string) => {
    const info = REVIEW_CYCLE_TYPE_MAP[nextType];
    if (info?.months && start) setPeriodEnd(addMonthsEndDate(start, info.months));
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    setType(value);
    applyTypePeriod(value, periodStart);
  }, [applyTypePeriod, periodStart]);

  const handlePeriodStartChange = useCallback((value: string) => {
    setPeriodStart(value);
    applyTypePeriod(type, value);
  }, [applyTypePeriod, type]);

  const resetForm = useCallback(() => {
    setName(""); setType("QUARTERLY"); setPeriodStart(""); setPeriodEnd(""); setDeadline(""); setFormErrors({});
  }, []);

  const openCreate = useCallback(() => {
    setEditCycle(null);
    resetForm();
    setSheetOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((cycle: ReviewCycle) => {
    setEditCycle(cycle);
    setName(cycle.name ?? "");
    setType(cycle.type ?? "QUARTERLY");
    setPeriodStart(cycle.periodStart ?? "");
    setPeriodEnd(cycle.periodEnd ?? "");
    setDeadline(cycle.deadline ?? "");
    setFormErrors({});
    setSheetOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    const errors = validateReviewCycleForm({ name, type, periodStart, periodEnd, deadline, orgStartDate });
    setFormErrors(errors);
    if (Object.keys(errors).length) { toast.error(Object.values(errors)[0]); return; }
    if (editCycle) {
      updateCycle.mutate(
        { id: editCycle.id, name: name.trim(), type, periodStart, periodEnd, deadline: deadline || undefined },
        {
          onSuccess: () => { toast.success("Cycle updated"); setSheetOpen(false); setEditCycle(null); resetForm(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      createCycle.mutate(
        { name: name.trim(), type, periodStart, periodEnd, deadline: deadline || undefined },
        {
          onSuccess: () => { toast.success("Cycle created"); setSheetOpen(false); resetForm(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    }
  }, [name, type, periodStart, periodEnd, deadline, orgStartDate, editCycle, createCycle, updateCycle, resetForm]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteCycle.mutate(deleteId, {
      onSuccess: () => { toast.success("Cycle deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteCycle]);

  if (isLoading) {
    return <ListSkeleton count={3} className="h-16 w-full rounded-lg" />;
  }
  if (isError) return <QueryErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <TabHeader count={`${cycles?.length ?? 0} cycles`}>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />New Cycle
        </Button>
      </TabHeader>

      {!cycles?.length ? (
        <EmptyState
          title="No review cycles yet. Create a quarterly or annual cycle."
          action={{ label: "New Cycle", onClick: openCreate }}
        />
      ) : (
        <div className="space-y-2">
          {cycles.map((cycle: ReviewCycle) => (
            <Card key={cycle.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{cycle.name}</p>
                    <StatusPill tone={CYCLE_TONE[cycle.status ?? ""] ?? "warning"} dot>{cycle.status}</StatusPill>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {cycle.periodStart} → {cycle.periodEnd}
                    {cycle.deadline && <> &middot; Deadline: {cycle.deadline}</>}
                    {cycle.type && (
                      <> &middot; {REVIEW_CYCLE_TYPE_MAP[cycle.type]?.label ?? cycle.type}</>
                    )}
                  </p>
                  {cycle.type && REVIEW_CYCLE_TYPE_MAP[cycle.type] && (
                    <p className="mt-1 max-w-md text-xs text-subtle-foreground">
                      {REVIEW_CYCLE_TYPE_MAP[cycle.type]!.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Cycle actions"><MoreHorizontal className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(cycle)}>
                      <Pencil />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(cycle.id)}>
                      <Trash2 />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) { setEditCycle(null); resetForm(); } }} title={editCycle ? "Edit Review Cycle" : "Create Review Cycle"} onSubmit={handleCreate} submitLabel={editCycle ? "Save Changes" : "Create"} isPending={createCycle.isPending || updateCycle.isPending}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Cycle Name</label>
            <span className="text-2xs text-muted-foreground tabular-nums">{name.length}/100</span>
          </div>
          <Input placeholder="e.g., Q2 2026 Review" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          {formErrors.name && <p className="text-2xs text-destructive">{formErrors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REVIEW_CYCLE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeInfo && (
            <p className="text-2xs text-muted-foreground">
              {typeInfo.description}
              {typeInfo.months ? " End date auto-fills from the start — adjust if needed." : ""}
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period Start</label>
            <Input type="date" value={periodStart} min={orgStartDate} max={periodEnd || undefined} onChange={(e) => handlePeriodStartChange(e.target.value)} />
            {formErrors.periodStart && <p className="text-2xs text-destructive">{formErrors.periodStart}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period End</label>
            <Input type="date" value={periodEnd} min={periodStart || orgStartDate} readOnly={type !== "CUSTOM"} onChange={(e) => setPeriodEnd(e.target.value)} className={type !== "CUSTOM" ? "bg-surface-sunken" : undefined} />
            {formErrors.periodEnd && <p className="text-2xs text-destructive">{formErrors.periodEnd}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Submission Deadline</label>
          <Input type="date" value={deadline} min={periodStart || undefined} max={periodEnd || undefined} onChange={(e) => setDeadline(e.target.value)} />
          {formErrors.deadline && <p className="text-2xs text-destructive">{formErrors.deadline}</p>}
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete review cycle"
        description="Are you sure you want to delete this review cycle? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteCycle.isPending}
      />
    </div>
  );
}
