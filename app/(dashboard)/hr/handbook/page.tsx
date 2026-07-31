"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, FileText, Trash2, Eye, Pencil, MoreHorizontal,
  Upload, Link2, Loader2, BookOpen, CheckCircle2, Info,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { handbookVersionSchema } from "@/lib/validations/handbook";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { viewFile } from "@/hooks/use-file-url";

interface HandbookVersion {
  id: number;
  version: string;
  title: string;
  description: string | null;
  documentUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string | null;
}

const MANAGER_ROLES = new Set(["CEO", "ADMIN", "HR", "BRANCH_MANAGER", "BRANCH_HR"]);

const hbKeys = {
  all: [...queryKeys.hr.all, "handbook"] as const,
  list: () => [...hbKeys.all, "list"] as const,
};

function statusBadge(s: string | null): "default" | "secondary" | "outline" {
  if (s === "PUBLISHED") return "default";
  if (s === "ARCHIVED") return "outline";
  return "secondary";
}

type ContentMode = "url" | "file";

function HandbookFormFields({
  version, setVersion,
  title, setTitle,
  description, setDescription,
  documentUrl, setDocumentUrl,
  contentMode, setContentMode,
  errors,
  touched,
  onBlur,
}: {
  version: string; setVersion: (v: string) => void;
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  documentUrl: string; setDocumentUrl: (v: string) => void;
  contentMode: ContentMode;
  setContentMode: (mode: ContentMode) => void;
  errors: Record<string, string>;
  touched: Set<string>;
  onBlur: (field: string) => void;
}) {
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContentModeChange = useCallback((value: string) => {
    const mode = value as ContentMode;
    setContentMode(mode);
    if (mode === "url") {
      setUploadStatus("idle");
      setUploadedFileName("");
    }
  }, [setContentMode]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadStatus("uploading");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "documents");
      const res = await fetch("/api/storage/upload", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }
      const data: { url: string; key?: string } = await res.json();
      setDocumentUrl(data.key || data.url);
      setUploadStatus("done");
    } catch (err) {
      setUploadStatus("error");
      toast.error(getErrorMessage(err));
    }
  }, [setDocumentUrl]);

  return (
    <div className="space-y-4 max-w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Version <span className="text-destructive">*</span>
            </Label>
            <span className="text-[10px] text-muted-foreground">{version.length}/20</span>
          </div>
          <Input
            className={cn("max-w-full", (touched.has("version") && errors.version) && "border-destructive")}
            placeholder="e.g. 1.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            onBlur={() => onBlur("version")}
            maxLength={20}
          />
          {touched.has("version") && errors.version ? (
            <p className="text-[10px] text-destructive">{errors.version}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              At least two segments separated by a dot (e.g. 1.0, 2.1.3)
            </p>
          )}
        </div>
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <span className="text-[10px] text-muted-foreground">{title.length}/120</span>
          </div>
          <Input
            className={cn("max-w-full", (touched.has("title") && errors.title) && "border-destructive")}
            placeholder="e.g. Q1 2026 Employee Handbook"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => onBlur("title")}
            maxLength={120}
          />
          {touched.has("title") && errors.title && (
            <p className="text-[10px] text-destructive">{errors.title}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 min-w-0">
        <Label className="text-sm font-medium">Description</Label>
        <Textarea
          className="max-w-full resize-y min-h-[80px] max-h-[200px]"
          placeholder="What changed in this version..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
      </div>

      <div className="space-y-2 min-w-0">
        <Label className="text-sm font-medium">Document</Label>
        <Tabs value={contentMode} onValueChange={handleContentModeChange} className="w-full">
          <TabsList className="grid h-9 w-full grid-cols-2">
            <TabsTrigger value="url" type="button" className="gap-1.5 text-xs">
              <Link2 className="h-3 w-3" /> URL
            </TabsTrigger>
            <TabsTrigger value="file" type="button" className="gap-1.5 text-xs">
              <Upload className="h-3 w-3" /> Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="mt-2 space-y-1.5">
            <Input
              className="max-w-full"
              placeholder="https://..."
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              type="url"
            />
            <p className="text-[10px] text-muted-foreground">
              Paste a link to the handbook PDF or document hosted online.
            </p>
          </TabsContent>

          <TabsContent value="file" className="mt-2 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus === "uploading"}
            >
              {uploadStatus === "uploading" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="h-3.5 w-3.5" /> Choose file</>
              )}
            </Button>
            {uploadStatus === "done" && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="truncate max-w-xs">{uploadedFileName} uploaded</span>
              </div>
            )}
            {uploadStatus === "error" && (
              <p className="text-xs text-destructive">Upload failed — try again</p>
            )}
            {uploadStatus === "idle" && (
              <p className="text-[10px] text-muted-foreground">PDF, Word, Excel, PowerPoint — max 10 MB</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function useHandbookForm() {
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [contentMode, setContentMode] = useState<ContentMode>("url");
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const getFieldErrors = useCallback((v: string, t: string, desc: string, url: string) => {
    const parsed = handbookVersionSchema.safeParse({
      version: v.trim(),
      title: t.trim(),
      description: desc.trim() || undefined,
      documentUrl: url.trim() || undefined,
    });
    const errs: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!errs[field]) errs[field] = issue.message;
      }
    }
    return errs;
  }, []);

  const errors = getFieldErrors(version, title, description, documentUrl);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  const reset = useCallback(() => {
    setVersion("");
    setTitle("");
    setDescription("");
    setDocumentUrl("");
    setContentMode("url");
    setTouched(new Set());
  }, []);

  const populate = useCallback((v: HandbookVersion) => {
    setVersion(v.version);
    setTitle(v.title);
    setDescription(v.description ?? "");
    setDocumentUrl(v.documentUrl ?? "");
    setContentMode("url");
    setTouched(new Set());
  }, []);

  const validate = useCallback(() => {
    setTouched(new Set(["version", "title", "description", "documentUrl"]));
    const parsed = handbookVersionSchema.safeParse({
      version: version.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      documentUrl: documentUrl.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return null;
    }
    return parsed.data;
  }, [version, title, description, documentUrl]);

  return {
    version, setVersion,
    title, setTitle,
    description, setDescription,
    documentUrl, setDocumentUrl,
    contentMode, setContentMode,
    errors, touched,
    handleBlur, reset, populate, validate,
  };
}

function HandbookAdminContent() {
  const qc = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    queryKey: hbKeys.list(),
    queryFn: () => apiClient.get<HandbookVersion[]>("/hr/handbook"),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiClient.patch<HandbookVersion>(`/hr/handbook/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post<HandbookVersion>("/hr/handbook", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/handbook/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const form = useHandbookForm();

  const handleCreate = useCallback(() => {
    const data = form.validate();
    if (!data) return;
    create.mutate(
      { version: data.version, title: data.title, description: data.description, documentUrl: data.documentUrl },
      {
        onSuccess: () => { toast.success("Handbook version created as draft"); setSheetOpen(false); form.reset(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [form, create]);

  const handleUpdate = useCallback(() => {
    if (!editId) return;
    const data = form.validate();
    if (!data) return;
    update.mutate(
      { id: editId, data: { version: data.version, title: data.title, description: data.description, documentUrl: data.documentUrl } },
      {
        onSuccess: () => { toast.success("Handbook version updated"); setEditId(null); form.reset(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editId, form, update]);

  const changeStatus = useCallback((id: number, status: string, label: string) => {
    update.mutate(
      { id, data: { status } },
      {
        onSuccess: () => toast.success(label),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [update]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    const version = versions?.find((v) => v.id === deleteId);
    if (version?.status === "PUBLISHED") {
      toast.error("Cannot delete a published version. Unpublish or archive it first using the ⋯ menu.");
      setDeleteId(null);
      return;
    }
    remove.mutate(deleteId, {
      onSuccess: () => { toast.success("Version deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, remove, versions]);

  if (isLoading) {
    return (
      <PageWrapper title="Handbook" subtitle="Employee handbook versions">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee Handbook"
      subtitle="Manage and publish handbook versions"
      badge={`${versions?.length ?? 0} versions`}
      actions={
        <Button size="sm" onClick={() => { form.reset(); setSheetOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Version
        </Button>
      }
    >
      {versions?.some((v) => v.status === "PUBLISHED") && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Published versions are visible to all employees under <strong>HR → Handbook</strong>. Use ⋯ → Unpublish to hide a version from employees.</span>
        </div>
      )}

      {!versions?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyState
              illustration={<EmptyDocumentsIllustration className="h-32 w-32 opacity-95" />}
              title="No handbook versions yet"
              description="Create your first handbook version to publish it to employees."
              action={{ label: "New Version", onClick: () => { form.reset(); setSheetOpen(true); } }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">{v.title}</p>
                    <Badge variant="outline" className="text-[10px]">v{v.version}</Badge>
                    <Badge variant={statusBadge(v.status)} className="text-[10px]">{v.status}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                    {v.description && <span className="line-clamp-1 max-w-full">{v.description}</span>}
                    {v.publishedAt && <span>Published {format(new Date(v.publishedAt), "MMM d, yyyy")}</span>}
                    {v.createdAt && <span>Created {format(new Date(v.createdAt), "MMM d, yyyy")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {v.documentUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      title="View document"
                      onClick={() => void viewFile(v.documentUrl!)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={update.isPending}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => { form.populate(v); setEditId(v.id); }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {v.status === "DRAFT" && (
                        <DropdownMenuItem onClick={() => changeStatus(v.id, "PUBLISHED", "Version published")}>
                          Publish
                        </DropdownMenuItem>
                      )}
                      {v.status === "PUBLISHED" && (
                        <>
                          <DropdownMenuItem onClick={() => changeStatus(v.id, "DRAFT", "Version unpublished")}>
                            Unpublish
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeStatus(v.id, "ARCHIVED", "Version archived")}>
                            Archive
                          </DropdownMenuItem>
                        </>
                      )}
                      {v.status === "ARCHIVED" && (
                        <DropdownMenuItem onClick={() => changeStatus(v.id, "DRAFT", "Version restored to draft")}>
                          Restore to Draft
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(v.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) form.reset(); }}
        title="New Handbook Version"
        onSubmit={handleCreate}
        submitLabel="Save as draft"
        isPending={create.isPending}
      >
        <HandbookFormFields
          version={form.version} setVersion={form.setVersion}
          title={form.title} setTitle={form.setTitle}
          description={form.description} setDescription={form.setDescription}
          documentUrl={form.documentUrl} setDocumentUrl={form.setDocumentUrl}
          contentMode={form.contentMode} setContentMode={form.setContentMode}
          errors={form.errors} touched={form.touched} onBlur={form.handleBlur}
        />
      </HrSheet>

      <HrSheet
        open={editId !== null}
        onOpenChange={(open) => { if (!open) { setEditId(null); form.reset(); } }}
        title="Edit Handbook Version"
        onSubmit={handleUpdate}
        submitLabel="Save changes"
        isPending={update.isPending}
      >
        <HandbookFormFields
          version={form.version} setVersion={form.setVersion}
          title={form.title} setTitle={form.setTitle}
          description={form.description} setDescription={form.setDescription}
          documentUrl={form.documentUrl} setDocumentUrl={form.setDocumentUrl}
          contentMode={form.contentMode} setContentMode={form.setContentMode}
          errors={form.errors} touched={form.touched} onBlur={form.handleBlur}
        />
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Version"
        description="Are you sure you want to delete this handbook version?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={remove.isPending}
      />
    </PageWrapper>
  );
}

function HandbookEmployeeView() {
  const { data: versions, isLoading } = useQuery({
    queryKey: hbKeys.list(),
    queryFn: () => apiClient.get<HandbookVersion[]>("/hr/handbook"),
  });

  if (isLoading) {
    return (
      <PageWrapper title="Employee Handbook" subtitle="Company policies and guidelines">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </PageWrapper>
    );
  }

  const published = (versions ?? []).filter((v) => v.status === "PUBLISHED");

  return (
    <PageWrapper
      title="Employee Handbook"
      subtitle="Official company policies and guidelines"
    >
      {!published.length ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              illustration={<EmptyDocumentsIllustration className="h-32 w-32 opacity-95" />}
              title="No handbook published yet"
              description="The HR team hasn't published a handbook yet. Check back later."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {published.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{v.title}</p>
                    <Badge variant="outline" className="text-[10px]">v{v.version}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                    {v.description && <span className="line-clamp-1">{v.description}</span>}
                    {v.publishedAt && <span>Published {format(new Date(v.publishedAt), "MMM d, yyyy")}</span>}
                  </div>
                </div>
                {v.documentUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 shrink-0"
                    onClick={() => void viewFile(v.documentUrl!)}
                  >
                    <Eye className="h-3 w-3" /> View
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}

export default function HandbookPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <PageWrapper title="Handbook" subtitle="Loading…">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </PageWrapper>
    );
  }

  const role = session?.user?.role ?? "";
  return MANAGER_ROLES.has(role) ? <HandbookAdminContent /> : <HandbookEmployeeView />;
}
