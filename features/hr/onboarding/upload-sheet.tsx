"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { HrSheet } from "@/features/hr/hr-sheet";
import { DocumentFileUpload } from "@/components/storage/document-file-upload";
import { onboardingDocUploadSchema } from "@/lib/validations/common-forms";
import { viewFile } from "@/hooks/use-file-url";

import type { DocumentType, OnboardingDoc } from "./onboarding-types";

export interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType | null;
  existingDoc: OnboardingDoc | null;
  onSubmit: (fileUrl: string, fileName: string) => void;
  isPending: boolean;
}

export function UploadSheet({
  open,
  onOpenChange,
  documentType,
  existingDoc,
  onSubmit,
  isPending,
}: UploadSheetProps) {
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const reset = useCallback(() => {
    setFileUrl("");
    setFileName("");
  }, []);

  const handleSubmit = useCallback(() => {
    const parsed = onboardingDocUploadSchema.safeParse({ fileUrl, fileName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please upload a valid file");
      return;
    }
    onSubmit(parsed.data.fileUrl, parsed.data.fileName);
  }, [fileUrl, fileName, onSubmit]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset]
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
      submitDisabled={!fileUrl}
    >
      {existingDoc?.status === "RE_UPLOAD_REQUESTED" && existingDoc.remarks && (
        <div className="rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 px-3 py-2.5 text-[12px] text-orange-800 dark:text-orange-300">
          <p className="font-medium mb-0.5">Reviewer remarks</p>
          <p>{existingDoc.remarks}</p>
        </div>
      )}

      {existingDoc?.fileUrl && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-[12px]">
          <p className="text-muted-foreground mb-1">Currently submitted:</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs inline-flex items-center gap-1 break-all"
            onClick={() => viewFile(existingDoc.fileUrl)}
          >
            {existingDoc.fileName}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Button>
        </div>
      )}

      <Separator />

      <DocumentFileUpload
        folder="onboarding"
        label="Document file"
        onUploaded={({ url, fileName: name }) => {
          setFileUrl(url);
          setFileName(name);
        }}
        onClear={reset}
      />
      <p className="text-[11px] text-muted-foreground">
        Use a clear file name with one extension, e.g.{" "}
        <span className="font-medium">aadhaar-card.pdf</span>. Accepted: PDF, Word,
        Excel or image (.pdf, .doc, .docx, .xls, .xlsx, .png, .jpg, .jpeg, .gif,
        .webp), up to 10MB.
      </p>
    </HrSheet>
  );
}
