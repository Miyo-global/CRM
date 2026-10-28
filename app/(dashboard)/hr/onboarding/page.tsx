"use client";

import { useState, useCallback, useMemo } from "react";
import { isOnboardingManager } from "@/lib/constants/roles";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, CheckCircle2, Clock, AlertCircle, RefreshCw, ExternalLink, UserPlus, TrendingUp } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import type { Tone } from "@/lib/design/tones";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DocumentFileUpload } from "@/components/storage/document-file-upload";
import { onboardingDocUploadSchema } from "@/lib/validations/common-forms";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { HrSheet } from "@/features/hr/hr-sheet";
import { OnboardingWizard, type OnboardingPrefill } from "@/components/hr/onboarding-wizard";

import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  documentTypesForRole,
} from "@/lib/hr/document-type-requirements";
import {
  useOnboardingStatus,
  useInitiateOnboarding,
  type OnboardingStatus,
} from "@/lib/api/hooks/hr/onboarding";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DocumentType {
  id: number;
  name: string;
  description: string | null;
  isMandatory: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  applicableRoles: string[] | null;
}

interface OnboardingDoc {
  id: number;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_UPLOAD_REQUESTED";
  reviewedAt: string | null;
  reviewerName: string | null;
  remarks: string | null;
  version: number | null;
}

function useMyOnboardingDocs() {
  return useQuery<OnboardingDoc[]>({
    queryKey: ["hr", "my-onboarding-docs"],
    queryFn: () => apiClient.get<OnboardingDoc[]>("/hr/onboarding-docs"),
  });
}

function useDocumentTypes() {
  return useQuery<DocumentType[]>({
    queryKey: ["hr", "document-types"],
    queryFn: () => apiClient.get<DocumentType[]>("/hr/document-types"),
  });
}

function useSubmitOnboardingDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      documentTypeId: number;
      fileUrl: string;
      fileName: string;
    }) => apiClient.post("/hr/onboarding-docs", body),
    onSuccess: () => {
      // Invalidate both the employee's own doc list AND the HR summary so
      // the review page reflects the new submission without a manual refresh.
      qc.invalidateQueries({ queryKey: ["hr", "my-onboarding-docs"] });
      qc.invalidateQueries({ queryKey: ["hr", "onboarding-docs"] });
    },
  });
}

function docStatusIcon(status: OnboardingDoc["status"]) {
  const icons = {
    APPROVED: <CheckCircle2 className="size-4 text-muted-foreground" aria-hidden="true" />,
    SUBMITTED: <Clock className="size-4 text-muted-foreground" aria-hidden="true" />,
    REJECTED: <AlertCircle className="size-4 text-muted-foreground" aria-hidden="true" />,
    RE_UPLOAD_REQUESTED: <RefreshCw className="size-4 text-muted-foreground" aria-hidden="true" />,
    default: <FileText className="size-4 text-muted-foreground" aria-hidden="true" />,
  };
  return icons[status as keyof typeof icons] || icons.default;
}

function docStatusTone(status: OnboardingDoc["status"]): Tone {
  const tones: Partial<Record<OnboardingDoc["status"], Tone>> = {
    APPROVED: "success",
    SUBMITTED: "warning",
    REJECTED: "danger",
    RE_UPLOAD_REQUESTED: "warning",
  };
  return tones[status] ?? "neutral";
}

function docStatusLabel(status: OnboardingDoc["status"]): string {
  const labels = {
    "APPROVED": "Approved",
    "SUBMITTED": "Under Review",
    "REJECTED": "Rejected",
    "RE_UPLOAD_REQUESTED": "Re-upload Required",
    default: "Pending",
  };
  return labels[status as keyof typeof labels] || labels.default;
}

function canUpload(status: OnboardingDoc["status"] | undefined): boolean {
  return !status || status === "PENDING" || status === "RE_UPLOAD_REQUESTED" || status === "REJECTED";
}

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType | null;
  existingDoc: OnboardingDoc | null;
  onSubmit: (fileUrl: string, fileName: string) => void;
  isPending: boolean;
}

function UploadSheet({
  open,
  onOpenChange,
  documentType,
  existingDoc,
  onSubmit,
  isPending,
}: UploadSheetProps) {
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const handleSubmit = useCallback(() => {
    const parsed = onboardingDocUploadSchema.safeParse({ fileUrl, fileName });
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message;
      toast.error(first ?? "Please upload a valid file");
      return;
    }
    onSubmit(parsed.data.fileUrl, parsed.data.fileName);
  }, [fileUrl, fileName, onSubmit]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setFileUrl("");
        setFileName("");
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  const handleUploaded = useCallback(
    ({ url, fileName: name }: { url: string; key: string; fileName: string }) => {
      setFileUrl(url);
      setFileName(name);
    },
    [],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={
        existingDoc
          ? `Re-upload: ${documentType?.name}`
          : `Upload: ${documentType?.name}`
      }
      description={
        documentType?.description ??
        "Submit this document as part of your onboarding checklist."
      }
      onSubmit={handleSubmit}
      submitLabel="Submit Document"
      isPending={isPending}
    >
      {existingDoc?.status === "RE_UPLOAD_REQUESTED" && existingDoc.remarks && (
        <div className="rounded-md bg-warning-soft px-3 py-2.5 text-xs text-warning-strong">
          <p className="font-medium mb-0.5">Reviewer remarks</p>
          <p>{existingDoc.remarks}</p>
        </div>
      )}

      <Separator />

      <DocumentFileUpload
        folder="onboarding"
        label="Document file"
        onUploaded={handleUploaded}
        onClear={() => {
          setFileUrl("");
          setFileName("");
        }}
      />

      {fileName ? (
        <p className="text-xs text-muted-foreground">
          Ready to submit: <span className="font-medium text-foreground">{fileName}</span>
        </p>
      ) : null}
    </HrSheet>
  );
}

function EmployeeDocumentsTab() {
  const { data: session } = useSession();
  const { data: myDocs, isLoading: docsLoading, isError: docsError, error: docsErr, refetch: refetchDocs } = useMyOnboardingDocs();
  const { data: docTypes, isLoading: typesLoading, isError: typesError, error: typesErr, refetch: refetchTypes } = useDocumentTypes();
  const submitDoc = useSubmitOnboardingDoc();
  const userRole = session?.user?.role ?? null;

  const [uploadTarget, setUploadTarget] = useState<DocumentType | null>(null);
  const [uploadExisting, setUploadExisting] = useState<OnboardingDoc | null>(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  const isLoading = docsLoading || typesLoading;

  const checklist = useMemo(() => {
    const types = documentTypesForRole(docTypes ?? [], userRole);
    const docsByTypeId = new Map<number, OnboardingDoc>();
    for (const d of myDocs ?? []) {
      if (!docsByTypeId.has(d.documentTypeId)) {
        docsByTypeId.set(d.documentTypeId, d);
      }
    }
    return types.map((dt) => ({
      docType: dt,
      submission: docsByTypeId.get(dt.id) ?? null,
    }));
  }, [docTypes, myDocs, userRole]);

  const requiredChecklist = checklist.filter((c) => c.docType.isMandatory);
  const approvedCount = requiredChecklist.filter(
    (c) => c.submission?.status === "APPROVED",
  ).length;

  const handleOpenUpload = useCallback(
    (dt: DocumentType, existing: OnboardingDoc | null) => {
      setUploadTarget(dt);
      setUploadExisting(existing);
      setUploadSheetOpen(true);
    },
    []
  );

  const handleSubmit = useCallback(
    (fileUrl: string, fileName: string) => {
      if (!uploadTarget) return;
      submitDoc.mutate(
        {
          documentTypeId: uploadTarget.id,
          fileUrl,
          fileName,
        },
        {
          onSuccess: () => {
            toast.success("Document submitted for review");
            setUploadSheetOpen(false);
            setUploadTarget(null);
            setUploadExisting(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [uploadTarget, submitDoc]
  );

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (docsError || typesError) {
    return (
      <QueryErrorState
        error={docsErr ?? typesErr}
        onRetry={() => {
          void refetchDocs();
          void refetchTypes();
        }}
      />
    );
  }

  if (checklist.length === 0) {
    return (
      <EmptyState
        title="No documents required"
        description="Your HR team hasn't configured any required documents yet."
        compact
      />
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-3 rounded-lg border bg-surface-sunken/40 px-4 py-3">
        <p className="text-sm">
          <span className="font-semibold tabular-nums">{approvedCount}</span> of{" "}
          <span className="font-semibold tabular-nums">{requiredChecklist.length || checklist.length}</span>{" "}
          required documents approved
        </p>
      </div>

      <div className="space-y-2">
        {checklist.map(({ docType, submission }) => (
          <Card key={docType.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                <div className="shrink-0">
                  {docStatusIcon(submission?.status ?? "PENDING")}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium">{docType.name}</p>
                    {docType.isMandatory && (
                      <StatusPill tone="brand">Required</StatusPill>
                    )}
                    {submission && (
                      <StatusPill tone={docStatusTone(submission.status)} dot>
                        {docStatusLabel(submission.status)}
                      </StatusPill>
                    )}
                  </div>

                  {docType.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {docType.description}
                    </p>
                  )}

                  {submission?.fileUrl && (
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-brand-text hover:underline"
                      aria-label={`View ${submission.fileName}`}
                    >
                      <span className="truncate">{submission.fileName}</span>
                      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    </a>
                  )}

                  {submission?.status === "RE_UPLOAD_REQUESTED" &&
                    submission.remarks && (
                      <p className="mt-1 text-xs text-warning-strong">
                        Remarks: {submission.remarks}
                      </p>
                    )}
                </div>

                {canUpload(submission?.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleOpenUpload(docType, submission)}
                    aria-label={`Upload ${docType.name}`}
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    {submission ? "Re-upload" : "Upload"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <UploadSheet
        open={uploadSheetOpen}
        onOpenChange={setUploadSheetOpen}
        documentType={uploadTarget}
        existingDoc={uploadExisting}
        onSubmit={handleSubmit}
        isPending={submitDoc.isPending}
      />
    </>
  );
}

function InitiateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [userId, setUserId] = useState("");
  const initiate = useInitiateOnboarding();
  const { data: onboardingRows } = useOnboardingStatus();
  const { data: employees } = useHrEmployees(undefined);

  const activeOnboardingIds = useMemo(
    () => new Set((onboardingRows ?? []).map((r) => r.userId)),
    [onboardingRows],
  );

  const eligibleEmployees = useMemo(() => {
    if (!employees) return [];
    const list = Array.isArray(employees) ? employees : employees.data;
    return list.filter((e) => e.isActive !== false && !activeOnboardingIds.has(e.id));
  }, [employees, activeOnboardingIds]);

  const handleSubmit = useCallback(() => {
    if (!userId.trim()) {
      toast.error("Please select an employee");
      return;
    }
    initiate.mutate(userId.trim(), {
      onSuccess: (data) => {
        toast.success(`Onboarding initiated — ${data.tasksCreated} tasks created`);
        setUserId("");
        onOpenChange(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [userId, initiate, onOpenChange]);

  return (
    <HrSheet
      open={open}
      onOpenChange={(v) => {
        if (!v) setUserId("");
        onOpenChange(v);
      }}
      title="Initiate onboarding checklist"
      description="Assign the onboarding task template to an employee who already exists in the directory. To create a new hire, use the Add Employee tab first."
      onSubmit={handleSubmit}
      submitLabel="Start Onboarding"
      isPending={initiate.isPending}
    >
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Employee <span className="text-destructive">*</span>
        </Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger aria-label="Select employee">
            <SelectValue placeholder="Choose an employee…" />
          </SelectTrigger>
          <SelectContent>
            {eligibleEmployees.length === 0 ? (
              <SelectItem value="__none" disabled>
                No eligible employees
              </SelectItem>
            ) : (
              eligibleEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {[emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.email}
                  {emp.employeeId ? ` (${emp.employeeId})` : ""}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Only active employees without an existing onboarding checklist are listed.
        </p>
      </div>
    </HrSheet>
  );
}

/** MIYO-0663: the candidate's details, when the wizard was opened from a hire. */
function useAtsPrefill(applicationId: number | null) {
  return useQuery<OnboardingPrefill>({
    queryKey: ["ats", "hire-prefill", applicationId],
    enabled: applicationId !== null,
    queryFn: () => apiClient.get<OnboardingPrefill>(`/ats/applications/${applicationId}/hire`),
  });
}

function stalledBadge(row: OnboardingStatus): boolean {
  if (row.percentComplete >= 100) return false;
  if (!row.lastCompletedAt) return false;
  const last = new Date(row.lastCompletedAt).getTime();
  return Date.now() - last > 48 * 60 * 60 * 1000;
}

const ONBOARDING_TABS = ["wizard", "workflow", "documents"] as const;
type OnboardingTab = (typeof ONBOARDING_TABS)[number];

function isOnboardingTab(value: string | null): value is OnboardingTab {
  return value !== null && ONBOARDING_TABS.includes(value as OnboardingTab);
}

function HrWorkflowTab() {
  const { data, isLoading, isError, error, refetch } = useOnboardingStatus();
  const [initiateOpen, setInitiateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <QueryErrorState error={error} onRetry={() => void refetch()} />;
  }

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <p className="rounded-lg border bg-surface-sunken/40 px-4 py-3 text-sm text-muted-foreground">
        New hires are created under the <strong>Add employee</strong> tab. Their onboarding
        checklist starts automatically after you submit that form. Use the action below only
        for an <strong>existing</strong> employee who still needs a checklist.
      </p>
      <div className="flex w-full flex-wrap items-center justify-end gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setInitiateOpen(true)}
          aria-label="Initiate onboarding checklist for an existing employee"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Initiate checklist (existing employee)
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No onboardings in progress"
          description="Add a new employee first, or initiate a checklist for someone who already exists in the directory."
          compact
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card key={row.userId}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                    {row.userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p className="text-sm font-medium truncate">{row.userName}</p>
                      {row.employeeId ? (
                        <span className="text-xs tabular-nums text-muted-foreground">{row.employeeId}</span>
                      ) : null}
                      {row.percentComplete === 100 && (
                        <StatusPill tone="success" dot>
                          Complete
                        </StatusPill>
                      )}
                      {stalledBadge(row) && (
                        <StatusPill tone="danger" dot>
                          Stalled
                        </StatusPill>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={row.percentComplete} className="h-1.5 flex-1" />
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {row.completedTasks}/{row.totalTasks}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    asChild
                  >
                    <Link href={`/hr/onboarding/${row.userId}`} aria-label={`View ${row.userName} onboarding`}>
                      <TrendingUp className="size-4" aria-hidden="true" />
                      View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InitiateSheet open={initiateOpen} onOpenChange={setInitiateOpen} />
    </div>
  );
}

/** Same endpoint and cache key as /hr/document-review. */
interface OnboardeeDocSummary {
  userId: string;
  userName: string | null;
  employeeId: string | null;
  totalRequired: number;
  totalApproved: number;
  totalPendingReview: number;
  totalMissing: number;
}

function HrDocumentsTab() {
  const summary = useQuery<OnboardeeDocSummary[]>({
    queryKey: ["hr", "onboarding-docs", "summary"],
    queryFn: () => apiClient.get<OnboardeeDocSummary[]>("/hr/onboarding-docs/summary"),
  });
  const rows = summary.data ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Manage onboarding document configuration and review employee submissions.
      </p>
      {summary.isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : summary.isError ? (
        <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No onboarding documents to track" compact />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.userId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {row.userName ?? "Employee"}
                    {row.employeeId ? <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">{row.employeeId}</span> : null}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {row.totalApproved}/{row.totalRequired} approved
                  </span>
                  {row.totalPendingReview > 0 ? (
                    <StatusPill tone="warning" dot>{row.totalPendingReview} to review</StatusPill>
                  ) : null}
                  {row.totalMissing > 0 ? (
                    <StatusPill tone="danger" dot>{row.totalMissing} missing</StatusPill>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Configure Document Types</p>
              <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
                Define which documents employees must submit during onboarding.
              </p>
              <Button size="sm" variant="outline" asChild>
                <Link href="/hr/document-types">
                  Configure Document Types →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Review Documents</p>
              <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
                View and approve documents submitted by employees during onboarding.
              </p>
              <Button size="sm" variant="outline" asChild>
                <Link href="/hr/document-review">
                  Review Documents →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isHROrCEO = isOnboardingManager(role);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const applicationId = useMemo(() => {
    const raw = Number(searchParams.get("application"));
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const { data: atsPrefill } = useAtsPrefill(applicationId);

  const activeTab = useMemo<OnboardingTab>(() => {
    const tab = searchParams.get("tab");
    return isOnboardingTab(tab) ? tab : "wizard";
  }, [searchParams]);

  const handleTabChange = useCallback(
    (tab: string) => {
      if (!isOnboardingTab(tab)) return;
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "wizard") params.delete("tab");
      else params.set("tab", tab);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Until the role is known, show a neutral skeleton rather than another
  // role's view (A22).
  if (status === "loading" || !role) {
    return (
      <PageWrapper title="Onboarding">
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-64" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Onboarding"
      subtitle={
        isHROrCEO
          ? "Add new employees, then track onboarding checklists and documents"
          : "Complete your onboarding steps"
      }
      noInternalScroll={!isHROrCEO}
      actions={
        isHROrCEO ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Employees
            </Link>
          </Button>
        ) : undefined
      }
    >
      {isHROrCEO ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList variant="underline">
            <TabsTrigger value="wizard">
              Add employee
            </TabsTrigger>
            <TabsTrigger value="workflow">
              {/* Short on phones so all three tabs fit at 375px (FR1-034). */}
              <span className="sm:hidden">Progress</span>
              <span className="hidden sm:inline">Onboarding progress</span>
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-0">
            <HrWorkflowTab />
          </TabsContent>

          <TabsContent value="wizard" className="mt-0">
            <OnboardingWizard prefill={atsPrefill} />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <HrDocumentsTab />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="checklist" className="flex flex-col flex-1 min-h-0">
          <TabsList variant="underline" className="shrink-0">
            <TabsTrigger value="checklist">
              My Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="flex-1 overflow-auto pb-6">
            <EmployeeDocumentsTab />
          </TabsContent>
        </Tabs>
      )}
    </PageWrapper>
  );
}
