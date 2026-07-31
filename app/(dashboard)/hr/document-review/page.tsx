"use client";

import { Fragment, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Eye,
  Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DocumentFileUpload } from "@/components/storage/document-file-upload";
import { onboardingDocUploadSchema } from "@/lib/validations/common-forms";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { getRoleLabel } from "@/lib/rbac/roles";
import { avatarColorClasses } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { viewFile } from "@/hooks/use-file-url";
import { documentTypesForRole } from "@/lib/hr/document-type-requirements";


interface EmployeeDocSummary {
  userId: string;
  userName: string | null;
  userImage: string | null;
  designation: string | null;
  employeeId: string | null;
  role: string | null;
  departmentName: string | null;
  totalRequired: number;
  totalSubmitted: number;
  totalApproved: number;
  totalRejected: number;
  totalPendingReview: number;
  totalMissing: number;
  requiredDocNames: string[];
  onboardingDocStatus: string | null;
}

interface DocTypeOption {
  id: number;
  name: string;
  isActive: boolean | null;
  isMandatory: boolean | null;
  applicableRoles: string[] | null;
  sortOrder: number | null;
}

interface ChecklistSubmission {
  id: number;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  version: number | null;
  status: OnboardingDoc["status"];
  reviewedAt: string | null;
  reviewerName: string | null;
  remarks: string | null;
  createdAt: string | null;
}

interface ChecklistItem {
  documentTypeId: number;
  documentTypeName: string;
  description: string | null;
  isMandatory: boolean;
  submission: ChecklistSubmission | null;
}

interface EmployeeDocsDetail {
  employee: {
    userId: string;
    userName: string | null;
    userEmail: string | null;
    employeeId: string | null;
    role: string | null;
    departmentName: string | null;
  } | null;
  checklist: ChecklistItem[];
  progress: {
    totalRequired: number;
    totalApproved: number;
    totalPendingReview: number;
    totalRejected: number;
    totalMissing: number;
    derivedStatus: string;
  };
}

interface OnboardingDoc {
  id: number;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  version: number | null;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_UPLOAD_REQUESTED";
  reviewedAt: string | null;
  reviewerName: string | null;
  remarks: string | null;
  createdAt: string | null;
}


function useDocReviewSummary() {
  return useQuery<EmployeeDocSummary[]>({
    queryKey: ["hr", "onboarding-docs", "summary"],
    queryFn: () => apiClient.get<EmployeeDocSummary[]>("/hr/onboarding-docs/summary"),
  });
}

function useEmployeeOnboardingDocs(userId: string | null) {
  return useQuery<EmployeeDocsDetail>({
    queryKey: ["hr", "onboarding-docs", userId],
    queryFn: () =>
      apiClient.get<EmployeeDocsDetail>("/hr/onboarding-docs", { userId }),
    enabled: !!userId,
  });
}

function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      status,
      remarks,
    }: {
      docId: number;
      status: "APPROVED" | "RE_UPLOAD_REQUESTED";
      remarks?: string;
    }) => apiClient.patch<{ success: boolean }>(`/hr/onboarding-docs/${docId}`, { status, remarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "onboarding-docs"] });
    },
  });
}


function toTitleCase(name: string | null): string {
  if (!name) return "Unknown";
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function docStatusVariant(
  status: OnboardingDoc["status"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "SUBMITTED":
      return "secondary";
    case "REJECTED":
      return "destructive";
    case "RE_UPLOAD_REQUESTED":
      return "outline";
    default:
      return "outline";
  }
}

function docStatusLabel(status: OnboardingDoc["status"]): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "SUBMITTED":
      return "Submitted";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "RE_UPLOAD_REQUESTED":
      return "Re-upload Requested";
  }
}

function overallStatusVariant(
  status: string | null
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "SUBMITTED":
    case "IN_PROGRESS":
      return "secondary";
    case "NOT_STARTED":
    case "PENDING":
      return "outline";
    default:
      return "outline";
  }
}

function overallStatusLabel(status: string | null): string {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "IN_PROGRESS":
      return "In Progress";
    case "SUBMITTED":
      return "Submitted";
    case "NOT_STARTED":
      return "Not started";
    case "PENDING":
      return "Pending";
    default:
      return status ?? "Not started";
  }
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


function ProgressBar({
  approved,
  total,
}: {
  approved: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((approved / total) * 100);
  return (
    <div className="flex flex-col gap-0.5 min-w-[130px]">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {approved}/{total}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground">
        {total === 0 ? "No docs required" : "Required docs approved"}
      </span>
    </div>
  );
}


export default function DocumentReviewPage() {
  const { data: summary, isLoading } = useDocReviewSummary();
  const reviewMutation = useReviewDocument();

  const [reviewUserId, setReviewUserId] = useState<string | null>(null);
  const [reviewUserName, setReviewUserName] = useState<string | null>(null);
  const [reviewUserRole, setReviewUserRole] = useState<string | null>(null);

  const [reuploadDoc, setReuploadDoc] = useState<ChecklistSubmission & { documentTypeName: string } | null>(null);
  const [reuploadRemarks, setReuploadRemarks] = useState("");

  const [approveDoc, setApproveDoc] = useState<ChecklistSubmission & { documentTypeName: string } | null>(null);
  const [hrUploadOpen, setHrUploadOpen] = useState(false);
  const [hrUploadTypeId, setHrUploadTypeId] = useState("");
  const [hrUploadFileUrl, setHrUploadFileUrl] = useState("");
  const [hrUploadFileName, setHrUploadFileName] = useState("");
  const [uploadForUserId, setUploadForUserId] = useState<string | null>(null);
  const [uploadForUserName, setUploadForUserName] = useState<string | null>(null);
  const [uploadForUserRole, setUploadForUserRole] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [groupBy, setGroupBy] = useState<"none" | "role" | "department">("none");

  const qc = useQueryClient();

  const { data: docTypes } = useQuery({
    queryKey: ["hr", "document-types"],
    queryFn: () => apiClient.get<DocTypeOption[]>("/hr/document-types"),
  });

  const uploadDocTypeOptions = useMemo(
    () => documentTypesForRole(docTypes ?? [], uploadForUserRole),
    [docTypes, uploadForUserRole],
  );

  const hrUploadMutation = useMutation({
    mutationFn: (body: {
      userId: string;
      documentTypeId: number;
      fileUrl: string;
      fileName: string;
    }) => apiClient.post("/hr/onboarding-docs", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "onboarding-docs"] });
    },
  });

  const {
    data: employeeDetail,
    isLoading: docsLoading,
  } = useEmployeeOnboardingDocs(reviewUserId);

  const checklist = employeeDetail?.checklist ?? [];


  const handleOpenReview = useCallback((emp: EmployeeDocSummary) => {
    setReviewUserId(emp.userId);
    setReviewUserName(emp.userName);
    setReviewUserRole(emp.role);
  }, []);

  const handleCloseReview = useCallback(() => {
    setReviewUserId(null);
    setReviewUserName(null);
    setReviewUserRole(null);
  }, []);

  const handleOpenUploadFor = useCallback((emp: EmployeeDocSummary) => {
    setUploadForUserId(emp.userId);
    setUploadForUserName(emp.userName);
    setUploadForUserRole(emp.role);
    setHrUploadTypeId("");
    setHrUploadFileUrl("");
    setHrUploadFileName("");
    setHrUploadOpen(true);
  }, []);

  const handleApprove = useCallback(() => {
    if (!approveDoc) return;
    reviewMutation.mutate(
      { docId: approveDoc.id, status: "APPROVED" },
      {
        onSuccess: () => {
          toast.success("Document approved");
          setApproveDoc(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [approveDoc, reviewMutation]);

  const handleReupload = useCallback(() => {
    if (!reuploadDoc) return;
    if (!reuploadRemarks.trim()) {
      toast.error("Please provide remarks explaining what needs to be corrected");
      return;
    }
    reviewMutation.mutate(
      {
        docId: reuploadDoc.id,
        status: "RE_UPLOAD_REQUESTED",
        remarks: reuploadRemarks.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Re-upload requested");
          setReuploadDoc(null);
          setReuploadRemarks("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [reuploadDoc, reuploadRemarks, reviewMutation]);

  const handleHrUpload = useCallback(() => {
    if (!uploadForUserId) return;
    const documentTypeId = Number(hrUploadTypeId);
    if (!documentTypeId) {
      toast.error("Select a document type");
      return;
    }
    const parsed = onboardingDocUploadSchema.safeParse({
      fileUrl: hrUploadFileUrl,
      fileName: hrUploadFileName,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please upload a valid file");
      return;
    }
    hrUploadMutation.mutate(
      {
        userId: uploadForUserId,
        documentTypeId,
        fileUrl: parsed.data.fileUrl,
        fileName: parsed.data.fileName,
      },
      {
        onSuccess: () => {
          toast.success("Document uploaded on behalf of employee");
          setHrUploadOpen(false);
          setHrUploadTypeId("");
          setHrUploadFileUrl("");
          setHrUploadFileName("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [
    uploadForUserId,
    hrUploadTypeId,
    hrUploadFileUrl,
    hrUploadFileName,
    hrUploadMutation,
  ]);

  const allEmployees = summary ?? [];

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of allEmployees) if (e.role) set.add(e.role);
    return Array.from(set).sort();
  }, [allEmployees]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of allEmployees) if (e.departmentName) set.add(e.departmentName);
    return Array.from(set).sort();
  }, [allEmployees]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEmployees.filter((e) => {
      if (roleFilter !== "ALL" && e.role !== roleFilter) return false;
      if (
        departmentFilter !== "ALL" &&
        (e.departmentName ?? "") !== departmentFilter
      )
        return false;
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING_REVIEW") {
          if (!e.totalPendingReview || e.totalPendingReview === 0) return false;
        } else if ((e.onboardingDocStatus ?? "NOT_STARTED") !== statusFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        (e.userName ?? "").toLowerCase().includes(q) ||
        (e.employeeId ?? "").toLowerCase().includes(q) ||
        (e.designation ?? "").toLowerCase().includes(q)
      );
    });
  }, [allEmployees, search, roleFilter, departmentFilter, statusFilter]);

  const groups = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", items: list }];
    }
    const map = new Map<string, EmployeeDocSummary[]>();
    for (const e of list) {
      const key =
        groupBy === "role"
          ? e.role ?? ""
          : e.departmentName ?? "No department";
      const bucket = map.get(key);
      if (bucket) bucket.push(e);
      else map.set(key, [e]);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => ({
        key,
        label: groupBy === "role" ? getRoleLabel(key) : key,
        items,
      }));
  }, [list, groupBy]);


  if (isLoading) {
    return (
      <PageWrapper
        title="Document Review"
        subtitle="Review employee onboarding documents"
      >
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Document Review"
      subtitle="Review employee onboarding documents"
      badge={`${list.length} of ${allEmployees.length} employees`}
    >
      {allEmployees.length === 0 ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="h-40 w-40" />}
          title="No documents to review"
          description="Once employees submit onboarding documents, they will appear here."
        />
      ) : (
        <TooltipProvider>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by name, ID, or designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:max-w-xs"
              aria-label="Search employees"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {getRoleLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {departmentOptions.length > 0 && (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All departments</SelectItem>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="NOT_STARTED">Not started</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={groupBy}
              onValueChange={(v) => setGroupBy(v as "none" | "role" | "department")}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="role">Group by role</SelectItem>
                <SelectItem value="department">Group by department</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No employees match your filters.
            </p>
          ) : (
          <ScrollArea className="w-full" type="auto">
          <div className="min-w-[640px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50">
                          Documents
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Approved documents / documents required for this employee&apos;s role
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <Fragment key={group.key}>
                    {groupBy !== "none" && (
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={4} className="py-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.label}
                          </span>
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            {group.items.length}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {group.items.map((emp) => (
                  <TableRow key={emp.userId}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          {emp.userImage && (
                            <AvatarImage
                              src={emp.userImage}
                              alt={emp.userName ?? "Employee"}
                            />
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AvatarFallback
                                className={`text-xs ${avatarColorClasses(emp.userId)}`}
                              >
                                {getInitials(emp.userName)}
                              </AvatarFallback>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{toTitleCase(emp.userName)}</p>
                              {emp.employeeId ? (
                                <p className="text-[11px] opacity-80">ID: {emp.employeeId}</p>
                              ) : null}
                            </TooltipContent>
                          </Tooltip>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {toTitleCase(emp.userName)}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {getRoleLabel(emp.role)}
                            {emp.departmentName ? ` · ${emp.departmentName}` : ""}
                            {emp.designation ? ` · ${emp.designation}` : ""}
                            {emp.employeeId ? ` · ${emp.employeeId}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <ProgressBar
                              approved={emp.totalApproved}
                              total={emp.totalRequired}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[240px]">
                          {emp.totalRequired === 0 ? (
                            <span>
                              No documents required for {getRoleLabel(emp.role)}.
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <p>
                                {emp.totalApproved} of {emp.totalRequired} approved
                              </p>
                              {emp.requiredDocNames.length > 0 && (
                                <p className="text-[11px] opacity-80">
                                  Required for {getRoleLabel(emp.role)}:{" "}
                                  {emp.requiredDocNames.join(", ")}
                                </p>
                              )}
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={overallStatusVariant(emp.onboardingDocStatus)}
                          className="text-[10px]"
                        >
                          {overallStatusLabel(emp.onboardingDocStatus)}
                        </Badge>
                        {emp.totalPendingReview > 0 && (
                          <span className="text-[10px] font-medium text-amber-600">
                            {emp.totalPendingReview} to review
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleOpenReview(emp)}
                          aria-label={`Review documents for ${toTitleCase(emp.userName)}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Review
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => handleOpenUploadFor(emp)}
                          aria-label={`Upload document for ${toTitleCase(emp.userName)}`}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          Upload
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
          )}
        </div>
        </TooltipProvider>
      )}

      <Sheet open={reviewUserId !== null} onOpenChange={(open) => { if (!open) handleCloseReview(); }}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0 sm:max-w-lg w-full">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b space-y-2">
            <SheetTitle className="text-base">
              {toTitleCase(reviewUserName)} — Document Review
            </SheetTitle>
            <SheetDescription className="text-xs">
              {employeeDetail?.progress ? (
                <>
                  {employeeDetail.progress.totalApproved} of{" "}
                  {employeeDetail.progress.totalRequired} required documents approved
                  {getRoleLabel(reviewUserRole) ? ` for ${getRoleLabel(reviewUserRole)}` : ""}.
                  Approve or request re-upload for submitted files. Employees upload from
                  their onboarding checklist — use Upload on the row to submit on their behalf.
                </>
              ) : (
                <>
                  Review and approve submitted onboarding documents. Employees upload from
                  their own checklist.
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-4 space-y-3">
              {docsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : checklist.length === 0 ? (
                <EmptyState
                  illustration={<EmptyDocumentsIllustration className="h-24 w-24" />}
                  title="No document types configured"
                  description="Configure document types and role requirements in Document Types before reviewing submissions."
                  compact
                />
              ) : (
                checklist.map((item) => {
                  const doc = item.submission;
                  return (
                  <div
                    key={item.documentTypeId}
                    className="rounded-md border bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium">
                            {item.documentTypeName}
                          </p>
                          {item.isMandatory && (
                            <Badge
                              variant="default"
                              className="text-[9px] py-0 h-4 shrink-0"
                            >
                              Required
                            </Badge>
                          )}
                        </div>
                        {item.description ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        ) : null}
                        {doc ? (
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[11px] text-muted-foreground">
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs inline-flex items-center gap-0.5"
                            onClick={() => viewFile(doc.fileUrl)}
                            aria-label={`View ${doc.fileName}`}
                          >
                            {doc.fileName}
                            <ExternalLink className="h-3 w-3 ml-0.5" />
                          </Button>
                          {doc.fileSize != null && (
                            <span>{formatBytes(doc.fileSize)}</span>
                          )}
                          {doc.version != null && (
                            <span>v{doc.version}</span>
                          )}
                        </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-1 italic">
                            Not uploaded yet — employee must submit from their onboarding page.
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={doc ? docStatusVariant(doc.status) : "outline"}
                        className="text-[10px] shrink-0"
                      >
                        {doc ? docStatusLabel(doc.status) : "Missing"}
                      </Badge>
                    </div>

                    {doc?.reviewedAt && (
                      <p className="text-[11px] text-muted-foreground">
                        Reviewed {format(new Date(doc.reviewedAt), "MMM d, yyyy")}
                        {doc.reviewerName ? ` by ${doc.reviewerName}` : ""}
                      </p>
                    )}
                    {doc?.remarks && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Remarks: {doc.remarks}
                      </p>
                    )}

                    {doc?.status === "SUBMITTED" && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={() =>
                              setApproveDoc({
                                ...doc,
                                documentTypeName: item.documentTypeName,
                              })
                            }
                            aria-label={`Approve ${item.documentTypeName}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={() => {
                              setReuploadDoc({
                                ...doc,
                                documentTypeName: item.documentTypeName,
                              });
                              setReuploadRemarks("");
                            }}
                            aria-label={`Request re-upload for ${item.documentTypeName}`}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Request Re-upload
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={approveDoc !== null}
        onOpenChange={(open) => { if (!open) setApproveDoc(null); }}
        title="Approve Document"
        description={`Approve "${approveDoc?.documentTypeName}" submitted by ${toTitleCase(reviewUserName)}?`}
        confirmLabel="Approve"
        variant="default"
        onConfirm={handleApprove}
        isPending={reviewMutation.isPending}
      />

      <Sheet
        open={reuploadDoc !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReuploadDoc(null);
            setReuploadRemarks("");
          }
        }}
      >
        <SheetContent side="right" className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">Request Re-upload</SheetTitle>
            <SheetDescription className="text-xs">
              Explain what needs to be corrected for{" "}
              <strong>{reuploadDoc?.documentTypeName}</strong>.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Remarks <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Describe what needs to be corrected or re-submitted..."
                value={reuploadRemarks}
                onChange={(e) => setReuploadRemarks(e.target.value)}
                rows={4}
                aria-label="Re-upload remarks"
              />
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 border-t flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setReuploadDoc(null);
                setReuploadRemarks("");
              }}
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleReupload}
              disabled={reviewMutation.isPending || !reuploadRemarks.trim()}
            >
              {reviewMutation.isPending && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Request
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <HrSheet
        open={hrUploadOpen}
        onOpenChange={(open) => {
          setHrUploadOpen(open);
          if (!open) {
            setHrUploadTypeId("");
            setHrUploadFileUrl("");
            setHrUploadFileName("");
            setUploadForUserId(null);
            setUploadForUserName(null);
            setUploadForUserRole(null);
          }
        }}
        title={`Upload for ${toTitleCase(uploadForUserName)}`}
        description={
          uploadForUserRole
            ? `Submit a document on behalf of this employee. Showing types required for ${getRoleLabel(uploadForUserRole)}.`
            : "Submit an onboarding document on behalf of this employee."
        }
        onSubmit={handleHrUpload}
        submitLabel="Submit Document"
        isPending={hrUploadMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Document type</Label>
            <Select value={hrUploadTypeId} onValueChange={setHrUploadTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {uploadDocTypeOptions.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                    {t.isMandatory ? " (Required)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {uploadDocTypeOptions.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                No document types apply to this employee&apos;s role.
              </p>
            )}
          </div>
          <DocumentFileUpload
            folder="onboarding"
            label="Document file"
            onUploaded={({ url, fileName }) => {
              setHrUploadFileUrl(url);
              setHrUploadFileName(fileName);
            }}
            onClear={() => {
              setHrUploadFileUrl("");
              setHrUploadFileName("");
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Use a clear file name with a single extension, e.g.{" "}
            <span className="font-medium">aadhaar-card.pdf</span> or{" "}
            <span className="font-medium">passport-photo.jpg</span>. Accepted: PDF,
            Word, Excel, or image files up to 10MB.
          </p>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
