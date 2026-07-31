"use client";

import { memo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  Upload,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";

import { getErrorMessage } from "@/lib/get-error-message";

import { UploadSheet } from "./upload-sheet";
import {
  useMyOnboardingDocs,
  useDocumentTypes,
  useSubmitOnboardingDoc,
} from "./use-onboarding-docs";
import {
  docStatusVariant,
  docStatusLabel,
  canUpload,
  type DocumentType,
  type OnboardingDoc,
} from "./onboarding-types";


function docStatusIcon(status: OnboardingDoc["status"]) {
  const map = {
    APPROVED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    SUBMITTED: <Clock className="h-4 w-4 text-amber-500" />,
    REJECTED: <AlertCircle className="h-4 w-4 text-destructive" />,
    RE_UPLOAD_REQUESTED: <RefreshCw className="h-4 w-4 text-orange-500" />,
  } as const;
  return (map as Record<string, React.ReactNode>)[status] ?? (
    <FileText className="h-4 w-4 text-muted-foreground" />
  );
}


interface DocRowProps {
  docType: DocumentType;
  submission: OnboardingDoc | null;
  onUpload: (dt: DocumentType, existing: OnboardingDoc | null) => void;
}

const DocRow = memo(function DocRow({ docType, submission, onUpload }: DocRowProps) {
  const handleUpload = useCallback(() => {
    onUpload(docType, submission);
  }, [docType, submission, onUpload]);

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {docStatusIcon(submission?.status ?? "PENDING")}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium">{docType.name}</p>
              {docType.isMandatory && (
                <Badge variant="default" className="text-[9px] py-0 h-4 shrink-0">
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

            {submission?.status === "RE_UPLOAD_REQUESTED" && submission.remarks && (
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
              onClick={handleUpload}
              aria-label={`Upload ${docType.name}`}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              {submission ? "Re-upload" : "Upload"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});


export function EmployeeDocumentsTab() {
  const { data: myDocs, isLoading: docsLoading } = useMyOnboardingDocs();
  const { data: docTypes, isLoading: typesLoading } = useDocumentTypes();
  const submitDoc = useSubmitOnboardingDoc();

  const [uploadTarget, setUploadTarget] = useState<DocumentType | null>(null);
  const [uploadExisting, setUploadExisting] = useState<OnboardingDoc | null>(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  const isLoading = docsLoading || typesLoading;

  const checklist = (() => {
    const types = (docTypes ?? []).filter((dt) => dt.isActive !== false);
    const docsByTypeId = new Map((myDocs ?? []).map((d) => [d.documentTypeId, d]));
    return types.map((dt) => ({
      docType: dt,
      submission: docsByTypeId.get(dt.id) ?? null,
    }));
  })();

  const approvedCount = checklist.filter(
    (c) => c.submission?.status === "APPROVED"
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
        { documentTypeId: uploadTarget.id, fileUrl, fileName },
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
          <span className="font-semibold">{checklist.length}</span> documents approved
        </p>
      </div>

      <div className="space-y-2">
        {checklist.map(({ docType, submission }) => (
          <DocRow
            key={docType.id}
            docType={docType}
            submission={submission}
            onUpload={handleOpenUpload}
          />
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
