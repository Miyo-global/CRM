"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Settings,
  ClipboardCheck,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  UserPlus,
  Users,
  TrendingUp,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration, EmptyUploadIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { OnboardingWizard } from "@/components/hr/onboarding-wizard";

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
    "APPROVED": <CheckCircle2 className="h-4 w-4 text-green-600" />,
    "SUBMITTED": <Clock className="h-4 w-4 text-amber-500" />,
    "REJECTED": <AlertCircle className="h-4 w-4 text-destructive" />,
    "RE_UPLOAD_REQUESTED": <RefreshCw className="h-4 w-4 text-orange-500" />,
    default: <FileText className="h-4 w-4 text-muted-foreground" />,
  };
  return icons[status as keyof typeof icons] || icons.default;
}

function docStatusVariant(
  status: OnboardingDoc["status"]
): "default" | "secondary" | "outline" | "destructive" | "outline" {
  const variants = {
    "APPROVED": "default",
    "SUBMITTED": "secondary",
    "REJECTED": "destructive",
    "RE_UPLOAD_REQUESTED": "outline",
    default: "outline",
  };

  return (variants[status as keyof typeof variants] || variants.default) as "default" | "secondary" | "outline" | "destructive" | "outline";
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
        <div className="rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 px-3 py-2.5 text-[12px] text-orange-800 dark:text-orange-300">
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
  const { data: myDocs, isLoading: docsLoading } = useMyOnboardingDocs();
  const { data: docTypes, isLoading: typesLoading } = useDocumentTypes();
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
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (checklist.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyUploadIllustration className="h-24 w-24" />}
        title="No documents required"
        description="Your HR team hasn't configured any required documents yet."
        compact
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 mb-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <p className="text-sm">
          <span className="font-semibold">{approvedCount}</span> of{" "}
          <span className="font-semibold">{requiredChecklist.length || checklist.length}</span>{" "}
          required documents approved
        </p>
      </div>

      <div className="space-y-2">
        {checklist.map(({ docType, submission }) => (
          <Card key={docType.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {docStatusIcon(submission?.status ?? "PENDING")}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium">{docType.name}</p>
                    {docType.isMandatory && (
                      <Badge
                        variant="default"
                        className="text-[9px] py-0 h-4 shrink-0"
                      >
                        Required
                      </Badge>
                    )}
                    {submission && (
                      <Badge
                        variant={docStatusVariant(submission.status)}
                        className="text-[10px] shrink-0"
                      >
                        {docStatusLabel(submission.status)}
                      </Badge>
                    )}
                  </div>

                  {docType.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {docType.description}
                    </p>
                  )}

                  {submission?.fileUrl && (
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                      aria-label={`View ${submission.fileName}`}
                    >
                      {submission.fileName}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}

                  {submission?.status === "RE_UPLOAD_REQUESTED" &&
                    submission.remarks && (
                      <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">
                        Remarks: {submission.remarks}
                      </p>
                    )}
                </div>

                {canUpload(submission?.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => handleOpenUpload(docType, submission)}
                    aria-label={`Upload ${docType.name}`}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
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
        <p className="text-[11px] text-muted-foreground">
          Only active employees without an existing onboarding checklist are listed.
        </p>
      </div>
    </HrSheet>
  );
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
  const { data, isLoading } = useOnboardingStatus();
  const [initiateOpen, setInitiateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-2.5">
        New hires are created under the <strong>Add Employee</strong> tab. Their onboarding
        checklist starts automatically after you submit that form. Use the action below only
        for an <strong>existing</strong> employee who still needs a checklist.
      </p>
      <div className="flex items-center justify-center w-full gap-3">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={() => setInitiateOpen(true)}
          aria-label="Initiate onboarding checklist for an existing employee"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Initiate checklist (existing employee)
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-24 w-24" />}
          title="No onboardings in progress"
          description="Add a new employee first, or initiate a checklist for someone who already exists in the directory."
          compact
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card key={row.userId}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p className="text-sm font-medium truncate">{row.userName}</p>
                      {row.percentComplete === 100 && (
                        <Badge className="text-[10px] shrink-0" variant="default">
                          Complete
                        </Badge>
                      )}
                      {stalledBadge(row) && (
                        <Badge className="text-[10px] shrink-0" variant="destructive">
                          Stalled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={row.percentComplete} className="h-1.5 flex-1" />
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {row.completedTasks}/{row.totalTasks}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    asChild
                  >
                    <Link href={`/hr/onboarding/${row.userId}`} aria-label={`View ${row.userName} onboarding`}>
                      <TrendingUp className="h-3.5 w-3.5 mr-1" />
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


function HrDocumentsTab() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Manage onboarding document configuration and review employee submissions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Configure Document Types</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Define which documents employees must submit during onboarding.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                <Link href="/hr/document-types">
                  Configure Document Types →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Review Documents</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                View and approve documents submitted by employees during onboarding.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
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
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isHROrCEO = role === "HR" || role === "CEO";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

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
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Employees
            </Link>
          </Button>
        ) : undefined
      }
    >
      {isHROrCEO ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="wizard" className="text-xs h-7 px-3">
              Add Employee
            </TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs h-7 px-3">
              Onboarding progress
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs h-7 px-3">
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-0">
            <HrWorkflowTab />
          </TabsContent>

          <TabsContent value="wizard" className="mt-0">
            <OnboardingWizard />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <HrDocumentsTab />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="checklist" className="flex flex-col flex-1 min-h-0">
          <TabsList className="h-8 shrink-0">
            <TabsTrigger value="checklist" className="text-xs h-7 px-3">
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
