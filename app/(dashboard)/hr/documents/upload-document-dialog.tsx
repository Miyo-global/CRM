"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { useCreateDocument, useHrEmployees } from "@/lib/api/hooks/hr";
import {
  formSchema, type DocumentFormData, DocumentFormFields,
} from "@/features/hr/documents/document-form-fields";
import { getErrorMessage } from "@/lib/get-error-message";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function isAllowedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ];
  return allowedMimes.includes(file.type);
}

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  documentTypes: { value: string; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  categories: string[];
  defaultCategory?: string;
  isAdmin: boolean;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onSuccess,
  documentTypes,
  categories,
  defaultCategory = "",
  isAdmin,
}: UploadDocumentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);

  const { data: employees } = useHrEmployees(undefined);
  const createDocumentMutation = useCreateDocument();

  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat && cat.trim() !== ""),
    [categories],
  );

  const filteredDocumentTypes = useMemo(
    () => documentTypes.filter((type) => type.value && type.value.trim() !== "").map(({ value, label }) => ({ value, label })),
    [documentTypes],
  );

  const filteredEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return (employees as { id: string; firstName: string | null; lastName: string | null }[]).filter(
      (emp) => emp.id && emp.id.trim() !== "",
    );
  }, [employees]);

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "" as const,
      category: "",
      userId: "",
      isPublic: false,
      tags: [] as string[],
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: "",
      description: "",
      type: "",
      category: defaultCategory || "",
      userId: "",
      isPublic: false,
      tags: [],
    });
    setFiles([]);
    setFileErrors({});
    setTags([]);
    setTagInput("");
    setTitleManuallyEdited(false);
  }, [open, defaultCategory, form]);

  useEffect(() => {
    if (titleManuallyEdited) return;
    const currentName = form.getValues("name");
    if (files.length === 1 && !currentName.trim()) {
      form.setValue("name", files[0].name.replace(/\.[^/.]+$/, ""));
    } else if (files.length > 1 && !currentName.trim()) {
      form.setValue("name", `${files.length} files selected`);
    }
  }, [files, form, titleManuallyEdited]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const newErrors: Record<number, string> = {};
    const baseIndex = files.length;

    selectedFiles.forEach((f, i) => {
      const idx = baseIndex + i;
      if (!isAllowedFile(f)) {
        newErrors[idx] = "File type not supported. Use PDF, DOC, XLS, or images.";
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        newErrors[idx] = "File exceeds 10MB limit.";
        return;
      }
      validFiles.push(f);
    });

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
    if (Object.keys(newErrors).length > 0) {
      setFileErrors((prev) => ({ ...prev, ...newErrors }));
    }
    e.target.value = "";
  }, [files.length]);

  const handleRemoveFileAtIndex = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const index = parseInt(e.currentTarget.dataset.index ?? "-1");
    if (index < 0) return;
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) form.setValue("name", "");
      return updated;
    });
    setFileErrors((prev) => {
      const next: Record<number, string> = {};
      for (const [key, msg] of Object.entries(prev)) {
        const k = Number(key);
        if (k < index) next[k] = msg;
        else if (k > index) next[k - 1] = msg;
      }
      return next;
    });
  }, [form]);

  const handleClearAllFiles = useCallback(() => {
    setFiles([]);
    setFileErrors({});
    form.setValue("name", "");
  }, [form]);

  const handleTagInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      toast.error("Tag already exists");
      setTagInput("");
      return;
    }
    const newTags = [...tags, trimmed];
    setTags(newTags);
    form.setValue("tags", newTags);
    setTagInput("");
  }, [tagInput, tags, form]);

  const handleRemoveTag = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const tag = e.currentTarget.dataset.tag;
    if (!tag) return;
    setTags((prev) => {
      const updated = prev.filter((t) => t !== tag);
      form.setValue("tags", updated);
      return updated;
    });
  }, [form]);

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  const uploadFileFn = useCallback(async (file: File): Promise<{ url: string; size: number; mimeType: string } | { error: string }> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "documents");
      const response = await fetch("/api/storage/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 413) return { error: "File is too large (max 10MB)." };
        if (status === 415) return { error: "File type not supported." };
        return { error: (errorData as { error?: string }).error || "Storage upload failed" };
      }
      const data = await response.json();
      return { url: data.url, size: file.size, mimeType: file.type };
    } catch (error) {
      return { error: getErrorMessage(error) };
    } finally {
      setUploading(false);
    }
  }, []);

  const onSubmit = useCallback(async (data: DocumentFormData) => {
    if (files.length === 0) { toast.error("Please select at least one file to upload"); return; }
    if (files.length === 1 && !data.name.trim()) { toast.error("Document name is required"); return; }
    const documentType = data.type;
    if (documentType === "") {
      toast.error("Document type is required");
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;
    const nextErrors: Record<number, string> = {};

    const folderTag = data.category?.trim().toLowerCase();
    const submitTags = [...data.tags];
    if (folderTag && !submitTags.includes(folderTag)) {
      submitTags.push(folderTag);
    }

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
        const uploaded = await uploadFileFn(file);
        if ("error" in uploaded) {
          nextErrors[i] = uploaded.error;
          failCount++;
          continue;
        }
        const docName = files.length === 1 ? data.name : file.name.replace(/\.[^/.]+$/, "");
        try {
          await createDocumentMutation.mutateAsync({
            name: docName,
            description: data.description,
            type: documentType,
            category: data.category,
            userId: data.userId,
            isPublic: data.isPublic,
            expiryDate: data.expiryDate ? format(data.expiryDate, "yyyy-MM-dd") : undefined,
            tags: submitTags,
            fileUrl: uploaded.url,
            fileName: file.name,
            fileSize: uploaded.size,
            mimeType: uploaded.mimeType,
          });
          successCount++;
        } catch (err) {
          nextErrors[i] = getErrorMessage(err);
          failCount++;
        }
      }

      setFileErrors(nextErrors);

      if (successCount > 0) {
        toast.success(
          files.length === 1
            ? "Document uploaded successfully"
            : `${successCount} document${successCount > 1 ? "s" : ""} uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
        );
        if (failCount === 0) {
          onSuccess();
        }
      } else {
        toast.error("Failed to upload documents. See errors below each file.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setUploadProgress("");
    }
  }, [files, uploadFileFn, createDocumentMutation, onSuccess]);

  const getFileIcon = (f: File) => {
    if (f.type.startsWith("image/")) return <FileText className="h-5 w-5 text-amber-500" />;
    if (f.type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
    if (f.type.includes("word")) return <FileText className="h-5 w-5 text-blue-500" />;
    if (f.type.includes("excel") || f.type.includes("spreadsheet")) return <FileText className="h-5 w-5 text-emerald-500" />;
    return <FileText className="h-5 w-5 text-slate-400" />;
  };

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Upload Document${files.length > 1 ? "s" : ""}`}
      description="Upload files to the HR document library."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={
        isLoading || uploading
          ? uploadProgress || "Uploading..."
          : files.length > 1
            ? `Upload ${files.length} Documents`
            : "Upload Document"
      }
      isPending={isLoading || uploading || files.length === 0}
    >
      <Form {...form}>
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
            <Upload className="h-7 w-7 text-muted-foreground mb-1.5" />
            <span className="text-sm font-medium text-foreground">
              {files.length > 0 ? "Add more files" : "Click or drag to upload"}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              PDF, DOC, XLS, PNG, JPG up to 10MB {files.length === 0 && "• Multiple files supported"}
            </span>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleFileChange}
            />
          </label>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground" onClick={handleClearAllFiles}>
                  Clear all
                </Button>
              </div>
              <div className="max-h-[140px] overflow-y-auto space-y-1.5">
                {files.map((f, i) => (
                  <UploadFileRow
                    key={`${f.name}-${i}`}
                    file={f}
                    index={i}
                    error={fileErrors[i]}
                    getFileIcon={getFileIcon}
                    onRemove={handleRemoveFileAtIndex}
                  />
                ))}
              </div>
            </div>
          )}

          <DocumentFormFields
            filteredDocumentTypes={filteredDocumentTypes}
            filteredCategories={filteredCategories}
            filteredEmployees={filteredEmployees}
            isAdmin={isAdmin}
            filesCount={files.length}
            tags={tags}
            tagInput={tagInput}
            onTagInputChange={handleTagInputChange}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onTagKeyDown={handleTagKeyDown}
            onTitleManualEdit={() => setTitleManuallyEdited(true)}
          />
        </div>
      </Form>
    </HrSheet>
  );
}

function UploadFileRow({
  file,
  index,
  error,
  getFileIcon,
  onRemove,
}: {
  file: File;
  index: number;
  error?: string;
  getFileIcon: (f: File) => React.ReactNode;
  onRemove: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border min-w-0">
      {getFileIcon(file)}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(0)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
        </p>
        {error ? <p className="text-[10px] text-destructive mt-0.5">{error}</p> : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        data-index={index}
        onClick={onRemove}
        aria-label="Remove file"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
