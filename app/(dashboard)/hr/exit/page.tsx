"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import {
  useResignations,
  useCreateResignation,
  useHrReviewResignation,
  useCeoReviewResignation,
  useWithdrawResignation,
  useResignationProgress,
  type Resignation,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import {
  Plus,
  FileText,
  Download,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { useSession } from "next-auth/react";
import { isCEO as checkIsCEO } from "@/lib/constants/roles";
import { downloadResignationLetterTemplate } from "@/lib/hr/resignation-letter-template";
import { ResignationCard } from "@/features/hr/exit/resignation-card";
import { RESIGNATION_REASONS } from "@/lib/constants/hr-separation";

const NOTICE_PERIOD_DAYS = 60;

const REASON_CATEGORIES = [...RESIGNATION_REASONS];

const EMPTY_RESIGNATION_FORM = {
  reason: "",
  reasonCategory: "",
  reasonCategoryOther: "",
  willingForExitInterview: false,
  companyFeedback: "",
};

interface RejectDialogState {
  id: number;
  type: "hr" | "ceo";
}

export default function ExitManagementPage() {
  const { data: session } = useSession();
  const { data: resignations, isLoading } = useResignations();
  const createResignation = useCreateResignation();
  const hrReview = useHrReviewResignation();
  const ceoReview = useCeoReviewResignation();
  const withdrawResignation = useWithdrawResignation();

  const role = session?.user?.role;
  const userId = session?.user?.id;
  const isAdmin = role === "CEO" || role === "HR";
  const isHR = role === "HR";
  const isCEO = checkIsCEO(role);

  const hasActiveResignation = useMemo(
    () =>
      (resignations ?? []).some(
        (r) =>
          r.userId === userId &&
          r.status !== "WITHDRAWN" &&
          r.status !== "REJECTED" &&
          r.status !== "COMPLETED",
      ),
    [resignations, userId],
  );

  const canSubmitResignation = !isCEO && !hasActiveResignation;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [reason, setReason] = useState(EMPTY_RESIGNATION_FORM.reason);
  const [reasonCategory, setReasonCategory] = useState(EMPTY_RESIGNATION_FORM.reasonCategory);
  const [reasonCategoryOther, setReasonCategoryOther] = useState(EMPTY_RESIGNATION_FORM.reasonCategoryOther);
  const [willingForExitInterview, setWillingForExitInterview] = useState(
    EMPTY_RESIGNATION_FORM.willingForExitInterview,
  );
  const [companyFeedback, setCompanyFeedback] = useState(EMPTY_RESIGNATION_FORM.companyFeedback);

  const [hrApproveId, setHrApproveId] = useState<number | null>(null);

  const [ceoApproveId, setCeoApproveId] = useState<number | null>(null);

  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejectRemarksOpen, setRejectRemarksOpen] = useState(false);

  const [withdrawId, setWithdrawId] = useState<number | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const autoLwd = format(addDays(new Date(), NOTICE_PERIOD_DAYS), "yyyy-MM-dd");

  const resetResignationForm = useCallback(() => {
    setReason(EMPTY_RESIGNATION_FORM.reason);
    setReasonCategory(EMPTY_RESIGNATION_FORM.reasonCategory);
    setReasonCategoryOther(EMPTY_RESIGNATION_FORM.reasonCategoryOther);
    setWillingForExitInterview(EMPTY_RESIGNATION_FORM.willingForExitInterview);
    setCompanyFeedback(EMPTY_RESIGNATION_FORM.companyFeedback);
  }, []);

  const openResignationSheet = useCallback(() => {
    if (!canSubmitResignation) return;
    resetResignationForm();
    setSheetOpen(true);
  }, [canSubmitResignation, resetResignationForm]);

  const handleCancelResignation = useCallback(() => {
    resetResignationForm();
    setSheetOpen(false);
  }, [resetResignationForm]);

  const handleDownloadLetterTemplate = useCallback(() => {
    const reasonSummary =
      reasonCategory === "Other"
        ? reasonCategoryOther.trim() || "[State your reason briefly]"
        : reasonCategory || "[State your reason briefly]";

    downloadResignationLetterTemplate({
      date: format(new Date(), "dd MMM yyyy"),
      employeeName: session?.user?.name ?? "[Your Full Name]",
      lastWorkingDate: format(addDays(new Date(), NOTICE_PERIOD_DAYS), "dd MMM yyyy"),
      reason: reason.trim() || reasonSummary,
    });
  }, [reason, reasonCategory, reasonCategoryOther, session?.user?.name]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSubmitResignation = useCallback(() => {
    if (hasActiveResignation) {
      toast.error("You already have an active resignation in progress");
      return;
    }
    const trimmed = reason.trim();
    if (!reasonCategory) {
      toast.error("Please select a reason category");
      return;
    }
    if (reasonCategory === "Other" && !reasonCategoryOther.trim()) {
      toast.error("Please specify your reason when selecting Other");
      return;
    }
    if (trimmed.length < 50) {
      toast.error(`Detailed explanation must be at least 50 characters (${trimmed.length}/50)`);
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Detailed explanation must be at most 2000 characters");
      return;
    }
    createResignation.mutate(
      {
        reason: trimmed,
        lastWorkingDate: autoLwd,
        noticePeriodDays: NOTICE_PERIOD_DAYS,
        reasonCategory,
        reasonCategoryOther:
          reasonCategory === "Other" ? reasonCategoryOther.trim() : undefined,
        willingForExitInterview,
        companyFeedback: companyFeedback.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Resignation submitted");
          setSheetOpen(false);
          resetResignationForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    hasActiveResignation,
    reason,
    reasonCategory,
    reasonCategoryOther,
    willingForExitInterview,
    companyFeedback,
    autoLwd,
    createResignation,
    resetResignationForm,
  ]);

  const handleHrApprove = useCallback(() => {
    if (!hrApproveId) return;
    hrReview.mutate(
      { id: hrApproveId, action: "approve" },
      {
        onSuccess: () => {
          toast.success("Resignation approved by HR");
          setHrApproveId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [hrApproveId, hrReview]);

  const handleCeoApprove = useCallback(() => {
    if (!ceoApproveId) return;
    ceoReview.mutate(
      { id: ceoApproveId, action: "approve" },
      {
        onSuccess: () => {
          toast.success("Resignation approved by CEO");
          setCeoApproveId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [ceoApproveId, ceoReview]);

  const handleOpenRejectDialog = useCallback((id: number, type: "hr" | "ceo") => {
    setRejectDialog({ id, type });
    setRejectRemarks("");
    setRejectRemarksOpen(true);
  }, []);

  const handleRejectConfirm = useCallback(() => {
    if (!rejectDialog) return;
    const mutate = rejectDialog.type === "hr" ? hrReview.mutate : ceoReview.mutate;
    mutate(
      { id: rejectDialog.id, action: "reject", remarks: rejectRemarks.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Resignation rejected");
          setRejectRemarksOpen(false);
          setRejectDialog(null);
          setRejectRemarks("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [rejectDialog, rejectRemarks, hrReview, ceoReview]);

  const handleWithdraw = useCallback(() => {
    if (!withdrawId) return;
    withdrawResignation.mutate(
      { id: withdrawId },
      {
        onSuccess: () => {
          toast.success("Resignation withdrawn");
          setWithdrawId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [withdrawId, withdrawResignation]);

  if (isLoading) {
    return (
      <PageWrapper title="Exit Management" subtitle="Resignations and offboarding">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Exit Management"
      subtitle="Resignations, exit interviews, and offboarding"
      badge={`${resignations?.length ?? 0} records`}
      actions={
        canSubmitResignation ? (
          <Button size="sm" onClick={openResignationSheet}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Submit Resignation
          </Button>
        ) : null
      }
    >
      {!isCEO && hasActiveResignation && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          You already have an active resignation request in progress. Withdraw it before submitting a new one.
        </div>
      )}

      {!resignations?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyState
              illustration={<EmptyPersonIllustration className="h-32 w-32 opacity-95" />}
              title="No resignations on record"
              description="Resignation requests and offboarding details will appear here."
              action={
                canSubmitResignation
                  ? { label: "Submit Resignation", onClick: openResignationSheet }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {resignations.map((r: Resignation) => (
            <ResignationCard
              key={r.id}
              resignation={r}
              isExpanded={expandedIds.has(r.id)}
              isAdmin={isAdmin}
              isHR={isHR}
              isCEO={isCEO}
              userId={userId}
              onToggleExpand={toggleExpand}
              onHrApprove={setHrApproveId}
              onHrReject={(id) => handleOpenRejectDialog(id, "hr")}
              onCeoApprove={setCeoApproveId}
              onCeoReject={(id) => handleOpenRejectDialog(id, "ceo")}
              onWithdraw={setWithdrawId}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen && !isCEO}
        onOpenChange={(open) => {
          if (!open) {
            resetResignationForm();
          }
          setSheetOpen(open && !isCEO);
        }}
        title="Submit Resignation"
        onSubmit={handleSubmitResignation}
        onCancel={handleCancelResignation}
        submitLabel="Submit"
        isPending={createResignation.isPending}
      >
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Notice period is <strong className="text-foreground">60 days</strong> as per
            company policy. Your last working date will be{" "}
            <strong className="text-foreground">
              {format(addDays(new Date(), NOTICE_PERIOD_DAYS), "dd MMM yyyy")}
            </strong>
            .
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason Category</label>
          <Select
            value={reasonCategory}
            onValueChange={(v) => {
              setReasonCategory(v);
              if (v !== "Other") setReasonCategoryOther("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category..." />
            </SelectTrigger>
            <SelectContent>
              {REASON_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {reasonCategory === "Other" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Specify reason</label>
            <Input
              placeholder="Describe your reason category..."
              value={reasonCategoryOther}
              onChange={(e) => setReasonCategoryOther(e.target.value)}
              maxLength={200}
              className="max-w-full"
            />
          </div>
        )}

        <div className="space-y-1.5 max-w-full">
          <label className="text-sm font-medium">
            Detailed Explanation <span className="text-destructive">*</span>
          </label>
          <Textarea
            className="max-w-full min-h-[100px] resize-y"
            placeholder="Please describe your reason for leaving (minimum 50 characters)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {reason.trim().length}/50 min · {reason.length}/2000 max
          </p>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Willing for Exit Interview?</p>
            <p className="text-xs text-muted-foreground">
              We&apos;d love to hear your feedback in person.
            </p>
          </div>
          <Switch
            checked={willingForExitInterview}
            onCheckedChange={setWillingForExitInterview}
            aria-label="Willing for exit interview"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Company Feedback{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            placeholder="Any feedback about your experience at the company..."
            value={companyFeedback}
            onChange={(e) => setCompanyFeedback(e.target.value)}
            rows={3}
          />
        </div>

        <div className="pt-1">
          <p className="text-xs text-muted-foreground mb-2">
            Need a template? Download a pre-filled resignation letter:
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            onClick={handleDownloadLetterTemplate}
          >
            <Download className="h-3 w-3" />
            Download Resignation Letter Template
          </button>
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={hrApproveId !== null}
        onOpenChange={(open) => {
          if (!open) setHrApproveId(null);
        }}
        title="Approve Resignation (HR)"
        description="Are you sure you want to approve this resignation? It will be forwarded to the CEO for final approval."
        confirmLabel="Approve"
        variant="default"
        onConfirm={handleHrApprove}
        isPending={hrReview.isPending}
      />

      <ConfirmActionDialog
        open={ceoApproveId !== null}
        onOpenChange={(open) => {
          if (!open) setCeoApproveId(null);
        }}
        title="Approve Resignation (CEO)"
        description="Are you sure you want to give final approval for this resignation?"
        confirmLabel="Approve"
        variant="default"
        onConfirm={handleCeoApprove}
        isPending={ceoReview.isPending}
      />

      <HrSheet
        open={rejectRemarksOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectRemarksOpen(false);
            setRejectDialog(null);
            setRejectRemarks("");
          }
        }}
        title="Reject Resignation"
        onSubmit={handleRejectConfirm}
        submitLabel="Reject"
        isPending={hrReview.isPending || ceoReview.isPending}
      >
        <p className="text-sm text-muted-foreground">
          Provide a reason for rejection. The employee will be notified.
        </p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Remarks <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            placeholder="Enter your rejection remarks..."
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            rows={4}
          />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={withdrawId !== null}
        onOpenChange={(open) => {
          if (!open) setWithdrawId(null);
        }}
        title="Withdraw Resignation"
        description="Are you sure you want to withdraw your resignation? This action cannot be undone."
        confirmLabel="Withdraw"
        variant="destructive"
        onConfirm={handleWithdraw}
        isPending={withdrawResignation.isPending}
      />
    </PageWrapper>
  );
}
