"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  CheckCircle2,
  XCircle,
  Mail,
  AlertTriangle,
  Calendar,
  User,
  BadgeDollarSign,
  Check,
  Paperclip,
  FileText,
  Settings,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { EmptyPersonIllustration, EmptySearchIllustration } from "@/components/illustrations";

import { HrSheet } from "@/features/hr/hr-sheet";
import { EmployeeAssignCombobox } from "@/components/hr/employee-assign-combobox";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { FileUpload } from "@/components/storage/file-upload";

import {
  useTerminations,
  useCreateTermination,
  useSubmitTermination,
  useCompleteTermination,
  useCeoReviewTermination,
  useSendTerminationEmail,
  useTerminationReasons,
  useHrEmployees,
  type Termination,
  type TerminationStatus,
} from "@/lib/api/hooks/hr";
import type { Employee } from "@/types/hr";

import { getErrorMessage } from "@/lib/get-error-message";
import { isCEO as isCeoRole } from "@/lib/constants/roles";
import {
  TERMINATION_STATUSES,
  TERMINATION_STATUS_LABELS,
  OTHER_TERMINATION_REASON,
} from "@/lib/constants/hr-separation";
import { TerminationCard } from "./_components/termination-card";
import {
  buildLetterPreview,
  getInitials,
  STATUS_FILTER_OPTIONS,
  type StatusFilter,
} from "./_lib/utils";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";




export default function TerminationPage() {
  const { data: session } = useSession();

  const role = session?.user?.role;
  const isHR = role === "HR";
  const isCEO = role === "CEO";

  const { data: terminations, isLoading, isError, error, refetch } = useTerminations();
  const { data: employeesData } = useHrEmployees();
  const { data: reasonsData } = useTerminationReasons();
  const createTermination = useCreateTermination();
  const submitTermination = useSubmitTermination();
  const ceoReview = useCeoReviewTermination();
  const sendEmail = useSendTerminationEmail();
  const completeTermination = useCompleteTermination();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [noticePeriodWaived, setNoticePeriodWaived] = useState(false);
  const [severanceAmount, setSeveranceAmount] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

  const [submitId, setSubmitId] = useState<number | null>(null);

  const [reviewRecord, setReviewRecord] = useState<Termination | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | null>(null);
  const [ceoRemarks, setCeoRemarks] = useState("");
  const [ceoSheetOpen, setCeoSheetOpen] = useState(false);

  const [emailRecord, setEmailRecord] = useState<Termination | null>(null);
  const [completeId, setCompleteId] = useState<number | null>(null);

  const employees = useMemo<Employee[]>(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData as Employee[];
    const paged = employeesData as { items?: Employee[]; data?: Employee[] };
    return paged.items ?? paged.data ?? [];
  }, [employeesData]);

  const currentUserId = session?.user?.id;

  const terminableEmployees = useMemo(
    () =>
      employees.filter(
        (emp) => !isCeoRole(emp.role) && emp.id !== currentUserId,
      ),
    [employees, currentUserId],
  );

  const selectedEmployee = useMemo(
    () => terminableEmployees.find((e) => e.id === selectedUserId) ?? null,
    [terminableEmployees, selectedUserId],
  );

  const employeeOptions = useMemo(
    () =>
      terminableEmployees.map((emp) => ({
        id: emp.id,
        name: emp.name ?? "Unnamed",
        subtitle: emp.designation ?? undefined,
      })),
    [terminableEmployees],
  );

  const activeReasonOptions = useMemo(() => {
    const active = (reasonsData ?? []).filter((r) => r.isActive);
    const sorted = [...active].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id,
    );
    if (!sorted.some((r) => r.label === OTHER_TERMINATION_REASON)) {
      sorted.push({
        id: -1,
        orgId: "",
        label: OTHER_TERMINATION_REASON,
        description: "Use when none of the listed reasons apply. Requires a detailed explanation.",
        isActive: true,
        sortOrder: 9999,
        createdById: null,
        createdAt: null,
      });
    }
    return sorted;
  }, [reasonsData]);

  const isOtherSelected = selectedReasons.includes(OTHER_TERMINATION_REASON);

  const letterPreview = useMemo(
    () =>
      buildLetterPreview({
        employeeName: selectedEmployee?.name ?? "",
        designation: selectedEmployee?.designation ?? "",
        effectiveDate,
        reasons: selectedReasons,
        explanation,
        noticePeriodWaived,
        severanceAmount,
      }),
    [selectedEmployee, effectiveDate, selectedReasons, explanation, noticePeriodWaived, severanceAmount]
  );

  const list = useMemo(() => {
    const all = terminations ?? [];
    if (statusFilter === "ALL") return all;
    return all.filter((t) => t.status === statusFilter);
  }, [terminations, statusFilter]);

  const statusCounts = useMemo(() => {
    const all = terminations ?? [];
    const counts: Record<string, number> = { ALL: all.length };
    for (const s of TERMINATION_STATUSES) counts[s] = 0;
    for (const t of all) {
      if (t.status) counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return counts;
  }, [terminations]);


  const resetCreateForm = useCallback(() => {
    setSelectedUserId("");
    setSelectedReasons([]);
    setExplanation("");
    setEffectiveDate("");
    setNoticePeriodWaived(false);
    setSeveranceAmount("");
    setInternalNotes("");
    setEvidenceUrls([]);
  }, []);

  const handleEvidenceUpload = useCallback((url: string) => {
    setEvidenceUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  }, []);

  const handleRemoveEvidence = useCallback((url: string) => {
    setEvidenceUrls((prev) => prev.filter((u) => u !== url));
  }, []);

  const handleToggleReason = useCallback((reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  }, []);

  const handleCreateSubmit = useCallback(() => {
    if (!selectedUserId) {
      toast.error("Please select an employee");
      return;
    }
    if (isCeoRole(selectedEmployee?.role)) {
      toast.error("The CEO cannot be terminated through this process.");
      return;
    }
    if (selectedUserId === currentUserId) {
      toast.error("You cannot initiate your own termination.");
      return;
    }
    if (selectedReasons.length === 0) {
      toast.error("Please select at least one termination reason");
      return;
    }
    if (explanation.trim().length < 50) {
      toast.error(
        isOtherSelected
          ? "Selecting 'Other' requires a detailed explanation (min 50 characters)"
          : "Detailed explanation must be at least 50 characters"
      );
      return;
    }
    if (!effectiveDate) {
      toast.error("Please set an effective date");
      return;
    }

    createTermination.mutate(
      {
        userId: selectedUserId,
        reasons: selectedReasons,
        detailedExplanation: explanation.trim(),
        effectiveDate,
        severanceAmount: severanceAmount ? Number(severanceAmount) : undefined,
        noticePeriodWaived,
        internalNotes: internalNotes.trim() || undefined,
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Termination saved as draft");
          setCreateOpen(false);
          resetCreateForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    selectedUserId,
    selectedEmployee,
    currentUserId,
    selectedReasons,
    explanation,
    effectiveDate,
    severanceAmount,
    noticePeriodWaived,
    internalNotes,
    evidenceUrls,
    isOtherSelected,
    createTermination,
    resetCreateForm,
  ]);

  const handleSubmitForApproval = useCallback(() => {
    if (!submitId) return;
    submitTermination.mutate(submitId, {
      onSuccess: () => {
        toast.success("Submitted for CEO approval");
        setSubmitId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [submitId, submitTermination]);

  const handleOpenCeoReview = useCallback(
    (record: Termination, decision: "approve" | "reject") => {
      setReviewRecord(record);
      setReviewDecision(decision);
      setCeoRemarks("");
      setCeoSheetOpen(true);
    },
    []
  );

  const handleCeoReviewSubmit = useCallback(() => {
    if (!reviewRecord || !reviewDecision) return;
    if (reviewDecision === "reject" && !ceoRemarks.trim()) {
      toast.error("Remarks are required when rejecting");
      return;
    }
    ceoReview.mutate(
      {
        id: reviewRecord.id,
        decision: reviewDecision,
        remarks: ceoRemarks.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            reviewDecision === "approve"
              ? "Termination approved"
              : "Termination rejected"
          );
          setCeoSheetOpen(false);
          setReviewRecord(null);
          setReviewDecision(null);
          setCeoRemarks("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [reviewRecord, reviewDecision, ceoRemarks, ceoReview]);

  const handleSendEmailOpen = useCallback((record: Termination) => {
    if (record.emailSentAt) {
      toast.error("Termination email has already been sent");
      return;
    }
    setEmailRecord(record);
  }, []);

  const handleSendEmailConfirm = useCallback(() => {
    if (!emailRecord) return;
    sendEmail.mutate(emailRecord.id, {
      onSuccess: () => {
        toast.success("Termination email sent successfully");
        setEmailRecord(null);
      },
      onError: (e) => {
        toast.error(`Failed to send email: ${getErrorMessage(e)}`);
        setEmailRecord(null);
      },
    });
  }, [emailRecord, sendEmail]);

  const handleCompleteConfirm = useCallback(() => {
    if (!completeId) return;
    completeTermination.mutate(completeId, {
      onSuccess: () => {
        toast.success("Termination completed. Employee deactivated, FnF and asset return initiated.");
        setCompleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [completeId, completeTermination]);


  if (isLoading) {
    return (
      <PageWrapper
        title="Termination Management"
        subtitle="Manage employee terminations"
      >
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Termination Management"
      subtitle="Manage employee terminations"
      badge={`${(terminations ?? []).length} records`}
      actions={
        (isHR || isCEO) ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/settings/termination-reasons">
                <Settings className="size-4" aria-hidden="true" />
                Configure reasons
              </Link>
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              New Termination
            </Button>
          </div>
        ) : undefined
      }
      filters={
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
          {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <FilterChip
              key={value}
              active={statusFilter === value}
              count={statusCounts[value] > 0 ? statusCounts[value] : undefined}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </FilterChip>
          ))}
        </div>
      }
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        statusFilter === "ALL" ? (
          <EmptyState
            illustration={<EmptyPersonIllustration className="size-32" />}
            title="No termination records found."
            {...((isHR || isCEO) ? { action: { label: "New Termination", onClick: () => setCreateOpen(true) } } : {})}
          />
        ) : (
          <EmptyState
            illustration={<EmptySearchIllustration className="size-32" />}
            title="No results for these filters"
            description={`No ${TERMINATION_STATUS_LABELS[statusFilter as keyof typeof TERMINATION_STATUS_LABELS] ?? statusFilter} records.`}
            action={{ label: "Clear filters", onClick: () => setStatusFilter("ALL") }}
          />
        )
      ) : (
        <div className="space-y-3">
          {list.map((record: Termination) => (
            <TerminationCard
              key={record.id}
              record={record}
              isHR={isHR}
              isCEO={isCEO}
              onSubmit={(id) => setSubmitId(id)}
              onApprove={(id) => {
                const r = list.find((t) => t.id === id);
                if (r) handleOpenCeoReview(r, "approve");
              }}
              onReject={(id) => {
                const r = list.find((t) => t.id === id);
                if (r) handleOpenCeoReview(r, "reject");
              }}
              onSendEmail={handleSendEmailOpen}
              onComplete={(id) => setCompleteId(id)}
              isSubmitting={submitTermination.isPending}
              isCompleting={completeTermination.isPending}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
        title="New Termination"
        description="Create a termination record. It will be saved as a draft."
        onSubmit={handleCreateSubmit}
        submitLabel="Save as Draft"
        isPending={createTermination.isPending}
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Employee <span className="text-destructive">*</span>
          </Label>
          <EmployeeAssignCombobox
            employees={employeeOptions}
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            placeholder="Select an employee..."
            searchPlaceholder="Search by name or designation…"
            ariaLabel="Select employee"
            showUnassigned={false}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium">
              Termination Reasons <span className="text-destructive">*</span>
            </Label>
            <Link
              href="/settings/termination-reasons"
              className="shrink-0 text-2xs font-medium text-brand-text underline-offset-2 hover:underline"
            >
              Manage reasons
            </Link>
          </div>
          {activeReasonOptions.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              No active termination reasons configured.{" "}
              <Link href="/settings/termination-reasons" className="font-medium text-brand-text underline">
                Add reasons in Settings
              </Link>{" "}
              before creating a termination.
            </p>
          ) : (
          <div className="grid grid-cols-1 gap-2">
            {activeReasonOptions.map((reason) => (
              <div key={reason.label} className="flex items-start gap-2">
                <Checkbox
                  id={`reason-${reason.label}`}
                  checked={selectedReasons.includes(reason.label)}
                  onCheckedChange={() => handleToggleReason(reason.label)}
                  aria-label={reason.label}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <Label
                    htmlFor={`reason-${reason.label}`}
                    className="text-xs font-normal cursor-pointer"
                  >
                    {reason.label}
                  </Label>
                  {reason.description ? (
                    <p className="text-2xs text-muted-foreground mt-0.5">
                      {reason.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Detailed Explanation <span className="text-destructive">*</span>
          </Label>
          {isOtherSelected && (
            <p className="text-2xs text-warning-strong">
              You selected &quot;Other&quot; — a detailed explanation is required.
            </p>
          )}
          <Textarea
            placeholder="Minimum 50 characters. Describe the reasons and circumstances in detail..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={4}
            aria-label="Detailed explanation"
          />
          <p className="text-2xs text-muted-foreground">
            {explanation.length} / 50 min characters
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Effective Date <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            aria-label="Effective date"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Notice Period Waived</p>
            <p className="text-xs text-muted-foreground">
              Employee will not be required to serve notice period.
            </p>
          </div>
          <Switch
            checked={noticePeriodWaived}
            onCheckedChange={setNoticePeriodWaived}
            aria-label="Notice period waived"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Severance Amount{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₹
            </span>
            <Input
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              value={severanceAmount}
              onChange={(e) => setSeveranceAmount(e.target.value)}
              className="pl-6"
              aria-label="Severance amount"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Internal Notes{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            placeholder="Notes visible only to HR and management..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            aria-label="Internal notes"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Supporting Evidence{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <p className="text-2xs text-muted-foreground">
            Attach warning letters, performance reviews, incident reports or other
            documents supporting this termination.
          </p>
          <FileUpload
            folder="documents"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onUploadComplete={handleEvidenceUpload}
          />
          {evidenceUrls.length > 0 && (
            <ul className="space-y-1.5">
              {evidenceUrls.map((url, idx) => (
                <li
                  key={url}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-brand-text hover:underline"
                  >
                    <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">Evidence {idx + 1}</span>
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveEvidence(url)}
                    aria-label={`Remove evidence ${idx + 1}`}
                  >
                    <XCircle className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Letter Preview</Label>
          <Textarea
            readOnly
            value={letterPreview}
            rows={12}
            className="resize-none bg-surface-sunken/60 font-mono text-2xs"
            aria-label="Termination letter preview"
          />
          <p className="text-2xs text-muted-foreground">
            Auto-generated preview based on the fields above. The final letter will be
            generated upon email send.
          </p>
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={submitId !== null}
        onOpenChange={(open) => {
          if (!open) setSubmitId(null);
        }}
        title="Submit for CEO Approval"
        description="Are you sure you want to submit this termination record for CEO approval? The record will move to PENDING_CEO status."
        confirmLabel="Submit"
        variant="default"
        onConfirm={handleSubmitForApproval}
        isPending={submitTermination.isPending}
      />

      <HrSheet
        open={ceoSheetOpen}
        onOpenChange={(open) => {
          setCeoSheetOpen(open);
          if (!open) {
            setReviewRecord(null);
            setReviewDecision(null);
            setCeoRemarks("");
          }
        }}
        title={
          reviewDecision === "approve"
            ? "Approve Termination"
            : "Reject Termination"
        }
        description="Review the termination details before making a decision."
        onSubmit={handleCeoReviewSubmit}
        submitLabel={
          reviewDecision === "approve" ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Approve
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <XCircle className="size-4" aria-hidden="true" />
              Reject
            </span>
          )
        }
        isPending={ceoReview.isPending}
      >
        {reviewRecord && (
          <>
            <div className="flex items-center gap-3 rounded-md border border-border bg-surface-sunken/60 p-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-brand-soft text-xs text-brand-soft-foreground">
                  {getInitials(reviewRecord.employee?.name ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {reviewRecord.employee?.name ?? "Employee"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reviewRecord.employee?.designation ?? ""}
                  {reviewRecord.employee?.employeeId
                    ? ` · ID: ${reviewRecord.employee.employeeId}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Effective Date
              </Label>
              <p className="text-sm">
                {reviewRecord.effectiveDate
                  ? format(new Date(reviewRecord.effectiveDate), "MMMM d, yyyy")
                  : ""}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reasons
              </Label>
              <div className="flex flex-wrap gap-1">
                {(reviewRecord.reasons ?? []).map((r) => (
                  <Badge key={r} variant="outline">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detailed Explanation
              </Label>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {reviewRecord.detailedExplanation}
              </p>
            </div>

            {(reviewRecord.evidenceUrls?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <Label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Supporting Evidence
                </Label>
                <ul className="space-y-1.5">
                  {reviewRecord.evidenceUrls!.map((url, idx) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-brand-text hover:underline"
                      >
                        <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">Evidence document {idx + 1}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(reviewRecord.severanceAmount || reviewRecord.noticePeriodWaived) && (
              <div className="flex flex-wrap items-center gap-4 text-sm tabular-nums">
                {reviewRecord.severanceAmount &&
                  Number(reviewRecord.severanceAmount) > 0 && (
                    <span>
                      Severance:{" "}
                      <strong>
                        ₹
                        {Number(reviewRecord.severanceAmount).toLocaleString(DEFAULT_LOCALE)}
                      </strong>
                    </span>
                  )}
                {reviewRecord.noticePeriodWaived && (
                  <span className="text-warning-strong">
                    Notice period waived
                  </span>
                )}
              </div>
            )}

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                CEO Remarks{" "}
                {reviewDecision === "reject" ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground font-normal">(optional)</span>
                )}
              </Label>
              <Textarea
                placeholder={
                  reviewDecision === "reject"
                    ? "Remarks are required when rejecting..."
                    : "Add any remarks or comments..."
                }
                value={ceoRemarks}
                onChange={(e) => setCeoRemarks(e.target.value)}
                rows={3}
                aria-label="CEO remarks"
              />
            </div>
          </>
        )}
      </HrSheet>

      <ConfirmActionDialog
        open={emailRecord !== null}
        onOpenChange={(open) => {
          if (!open) setEmailRecord(null);
        }}
        title="Send Termination Email"
        description={`Send termination email to ${emailRecord?.employee?.name ?? "this employee"}? The employee will be officially notified. Account deactivation will happen when you mark the termination as Complete.`}
        confirmLabel="Send Email"
        variant="default"
        onConfirm={handleSendEmailConfirm}
        isPending={sendEmail.isPending}
      />

      <ConfirmActionDialog
        open={completeId !== null}
        onOpenChange={(open) => {
          if (!open) setCompleteId(null);
        }}
        title="Complete Termination"
        description="This will deactivate the employee's account, initiate Full & Final settlement, and create asset return records. This action cannot be undone."
        confirmLabel="Complete Termination"
        variant="destructive"
        onConfirm={handleCompleteConfirm}
        isPending={completeTermination.isPending}
      />
    </PageWrapper>
  );
}
