"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/storage/file-upload";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  useCreateDocument,
  useDeleteDocument,
  useHrDocuments,
} from "@/lib/api/hooks/hr/leaves-expenses";
import {
  LEAVE_ATTACHMENT_ACCEPT,
  LEAVE_ATTACHMENT_ALLOWED_EXTENSIONS,
  LEAVE_ATTACHMENT_ALLOWED_MIME_TYPES,
  LEAVE_ATTACHMENT_UPLOAD_FORMAT_HINT,
} from "@/lib/validations/files";
import { formatIST } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import type { DocumentType } from "@/types/hr";

/** Document kinds an employee uploads for themselves. */
const MY_DOCUMENT_TYPES: Array<{ value: DocumentType; label: string }> = [
  { value: "ID_PROOF", label: "ID proof" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "CONTRACT", label: "Contract" },
  { value: "RESUME", label: "Resume" },
  { value: "OTHER", label: "Other" },
];

export default function MyDocumentsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data: documents, isLoading } = useHrDocuments(userId);
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<DocumentType>("ID_PROOF");
  const [file, setFile] = useState<{ url: string; fileName: string } | null>(null);

  const rows = useMemo(() => documents ?? [], [documents]);

  const reset = () => {
    setSheetOpen(false);
    setName("");
    setType("ID_PROOF");
    setFile(null);
  };

  const handleSubmit = () => {
    if (!file) {
      toast.error("Attach a file first");
      return;
    }
    createDocument.mutate(
      {
        name: name.trim() || file.fileName,
        type,
        fileUrl: file.url,
        fileName: file.fileName,
      },
      {
        onSuccess: () => {
          toast.success("Document uploaded");
          reset();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <PageWrapper
      title="My documents"
      actions={<Button onClick={() => setSheetOpen(true)}>Upload</Button>}
    >
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No documents yet."
          action={{ label: "Upload", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell>
                  {MY_DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type}
                </TableCell>
                <TableCell>{formatIST(doc.createdAt)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button asChild variant="ghost" size="sm">
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDocument.mutate(doc.id)}
                    disabled={deleteDocument.isPending}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => (open ? setSheetOpen(true) : reset())}
        title="Upload document"
        onSubmit={handleSubmit}
        submitLabel="Upload"
        isPending={createDocument.isPending}
        submitDisabled={!file}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="doc-name">
            Name
          </label>
          <Input
            id="doc-name"
            value={name}
            maxLength={120}
            placeholder="Aadhaar card"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={(v) => setType(v as DocumentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MY_DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">File</label>
          <FileUpload
            folder="employee-documents"
            accept={LEAVE_ATTACHMENT_ACCEPT}
            allowedMimeTypes={LEAVE_ATTACHMENT_ALLOWED_MIME_TYPES}
            allowedExtensions={LEAVE_ATTACHMENT_ALLOWED_EXTENSIONS}
            formatHint={LEAVE_ATTACHMENT_UPLOAD_FORMAT_HINT}
            onUploadComplete={(url, _key, originalFileName) =>
              setFile({ url, fileName: originalFileName ?? "document" })
            }
          />
          <p className="text-xs text-muted-foreground">{LEAVE_ATTACHMENT_UPLOAD_FORMAT_HINT}</p>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
