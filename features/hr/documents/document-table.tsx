"use client";

import { useCallback, memo, useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import {
  FileText,
  Folder,
  FolderInput,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  History,
  File,
  FileSpreadsheet,
  FileImage,
  ArrowDown,
  Users,
  Search,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { toneSoft, type Tone } from "@/lib/design/tones";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { toast } from "sonner";
import { viewFile, downloadFile } from "@/hooks/use-file-url";
import {
  useHrEmployees,
  isPaginatedEmployees,
  useDocumentAssignments,
  useDocumentAssignmentCounts,
  useSetDocumentAssignments,
  useRemoveDocumentAssignments,
} from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Document } from "@/types/hr";
import { plural } from "@/lib/format-utils";

const DOCUMENT_TYPES = [
  { value: "CONTRACT", label: "Contract" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "ID_PROOF", label: "ID Proof" },
  { value: "PAYSLIP", label: "Payslip" },
  { value: "POLICY", label: "Policy" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "RESUME", label: "Resume" },
  { value: "OTHER", label: "Other" },
] as const;

const FILE_ICON_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  pdf:  { bg: "bg-danger-soft",    text: "text-danger-strong",    icon: FileText },
  docx: { bg: "bg-info-soft",   text: "text-info-strong",   icon: FileText },
  doc:  { bg: "bg-info-soft",   text: "text-info-strong",   icon: FileText },
  xlsx: { bg: "bg-success-soft", text: "text-success-strong", icon: FileSpreadsheet },
  xls:  { bg: "bg-success-soft", text: "text-success-strong", icon: FileSpreadsheet },
  csv:  { bg: "bg-success-soft", text: "text-success-strong", icon: FileSpreadsheet },
  png:  { bg: "bg-warning-soft", text: "text-warning-strong", icon: FileImage },
  jpg:  { bg: "bg-warning-soft", text: "text-warning-strong", icon: FileImage },
  jpeg: { bg: "bg-warning-soft", text: "text-warning-strong", icon: FileImage },
};

const DEFAULT_FILE_ICON = { bg: "bg-muted", text: "text-muted-foreground", icon: File };

const TYPE_TONES: Record<string, Tone> = {
  CONTRACT: "plum",
  OFFER_LETTER: "plum",
  POLICY: "info",
  PAYSLIP: "success",
  ID_PROOF: "warning",
  CERTIFICATE: "teal",
};

const FOLDER_TONES: Tone[] = ["info", "teal", "success", "warning"];

function getFileIconConfig(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return FILE_ICON_CONFIG[ext] || DEFAULT_FILE_ICON;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface FolderItem {
  name: string;
  count: number;
  colorIdx: number;
}

export interface DocumentTableProps {
  paginatedDocuments: Document[];
  folders: FolderItem[];
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
  selectedCategory: string;
  searchTerm: string;
  folderOptions?: string[];
  onPageChange: (page: number) => void;
  /** Omitted for viewers who may not delete (HR; QA-AUTH-04). */
  onDelete?: (documentId: number) => Promise<void>;
  onOpenUpload: () => void;
  onFolderSelect?: (folderName: string) => void;
  onMove?: (documentId: number, folderName: string) => Promise<void>;
  enableAssign?: boolean;
  /** When provided, an empty result renders the filtered-empty state with a "Clear filters" action. */
  onClearFilters?: () => void;
}


interface DocumentRowProps {
  doc: Document;
  assignedCount?: number;
  onDelete?: (id: number) => Promise<void>;
  onRequestMove?: (doc: Document) => void;
  onRequestAssign?: (doc: Document) => void;
}

function getOwnerLabel(doc: Document): string | null {
  const meta = doc.metadata as { ownerName?: string; uploadedByName?: string } | null | undefined;
  return meta?.ownerName ?? meta?.uploadedByName ?? null;
}

const DocumentRow = memo(function DocumentRow({ doc, assignedCount = 0, onDelete, onRequestMove, onRequestAssign }: DocumentRowProps) {
  const fileConfig = getFileIconConfig(doc.fileName || doc.name);
  const FileIcon = fileConfig.icon;
  const typeLabel =
    DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || "Other";
  const typeTone = TYPE_TONES[doc.type] ?? "neutral";
  const folderLabel = doc.category?.trim() || "Uncategorized";
  const isUncategorized = !doc.category?.trim();
  const ownerLabel = getOwnerLabel(doc);
  const ext = (doc.fileName || doc.name).split(".").pop()?.toUpperCase() || "";
  const hasFileUrl = !!doc.fileUrl;

  const handleView = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasFileUrl) { toast.error("This document has no file attached."); return; }
      viewFile(doc.fileUrl);
    },
    [hasFileUrl, doc.fileUrl],
  );

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasFileUrl) { toast.error("This document has no file attached."); return; }
      downloadFile(doc.fileUrl, doc.fileName || doc.name);
    },
    [hasFileUrl, doc.fileUrl, doc.fileName, doc.name],
  );

  const handleVersionHistory = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toast.info(`Document "${doc.name}" has ${plural(doc.version ?? 0, "version")}.`);
    },
    [doc.name, doc.version],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void onDelete?.(doc.id);
    },
    [onDelete, doc.id],
  );

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRequestMove?.(doc);
    },
    [onRequestMove, doc],
  );

  const handleAssign = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRequestAssign?.(doc);
    },
    [onRequestAssign, doc],
  );

  const handleMenuTriggerClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <TableRow className="group">
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${fileConfig.bg}`}>
            <FileIcon className={`size-4 ${fileConfig.text}`} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate" title={doc.fileName || doc.name}>
              {doc.fileName || doc.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-muted-foreground">
              {ext && <span className="font-mono uppercase">{ext}</span>}
              {ext && (ownerLabel || doc.isPublic) && <span aria-hidden>·</span>}
              {ownerLabel ? (
                <span className="truncate" title={ownerLabel}>{ownerLabel}</span>
              ) : doc.isPublic ? (
                <span>Public</span>
              ) : null}
              {assignedCount > 0 && (
                <>
                  {(ext || ownerLabel || doc.isPublic) && <span aria-hidden>·</span>}
                  <span className="inline-flex items-center gap-1 text-success-strong">
                    <Users className="h-3 w-3" aria-hidden />
                    Assigned to {assignedCount}
                  </span>
                </>
              )}
            </div>
            {doc.tags && doc.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {doc.tags.slice(0, 3).map((tag) => (
                  <StatusPill
                    key={tag}
                    tone={tag.toLowerCase().includes("confidential") ? "danger" : "neutral"}
                  >
                    #{tag}
                  </StatusPill>
                ))}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3 text-sm max-w-36">
        <span
          className={`truncate block ${isUncategorized ? "italic text-muted-foreground/70" : "text-muted-foreground"}`}
          title={folderLabel}
        >
          {folderLabel}
        </span>
      </TableCell>
      <TableCell className="px-4 py-3">
        <StatusPill tone={typeTone}>{typeLabel}</StatusPill>
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap tabular-nums">
        {doc.createdAt ? format(new Date(doc.createdAt), "MMM dd, yyyy") : "-"}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-muted-foreground text-right tabular-nums">
        {formatFileSize(doc.fileSize)}
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            disabled={!hasFileUrl}
            onClick={handleView}
          >
            <Eye className="size-3.5" aria-hidden />
            View
          </Button>
          <Button
            variant="outline"
            size="xs"
            disabled={!hasFileUrl}
            onClick={handleDownload}
          >
            <Download className="size-3.5" aria-hidden />
            Download
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={handleMenuTriggerClick}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!hasFileUrl} onClick={handleView}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!hasFileUrl} onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              {(doc.version || 1) > 1 && (
                <DropdownMenuItem onClick={handleVersionHistory}>
                  <History className="mr-2 h-4 w-4" />
                  Version History ({doc.version})
                </DropdownMenuItem>
              )}
              {onRequestMove && (
                <DropdownMenuItem onClick={handleMove}>
                  <FolderInput className="mr-2 h-4 w-4" />
                  Move to folder
                </DropdownMenuItem>
              )}
              {onRequestAssign && (
                <DropdownMenuItem onClick={handleAssign}>
                  <Users className="mr-2 h-4 w-4" />
                  Assign / Share
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-danger-strong">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
});


export function DocumentTable({
  paginatedDocuments,
  folders,
  page,
  pageSize,
  totalFiltered,
  totalPages,
  selectedCategory,
  searchTerm,
  folderOptions = [],
  onPageChange,
  onDelete,
  onOpenUpload,
  onFolderSelect,
  onMove,
  enableAssign = false,
  onClearFilters,
}: DocumentTableProps) {
  const [moveTarget, setMoveTarget] = useState<Document | null>(null);
  const [assignTarget, setAssignTarget] = useState<Document | null>(null);

  const { data: assignmentCounts } = useDocumentAssignmentCounts();

  const handleRequestMove = useCallback((doc: Document) => setMoveTarget(doc), []);
  const handleRequestAssign = useCallback((doc: Document) => setAssignTarget(doc), []);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {selectedCategory === "All Files" ? "All documents" : selectedCategory}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {searchTerm
              ? `${totalFiltered} result${totalFiltered === 1 ? "" : "s"} for “${searchTerm}”`
              : `${totalFiltered} document${totalFiltered === 1 ? "" : "s"} in this view`}
          </p>
        </div>
        {selectedCategory !== "All Files" && onFolderSelect && (
          <Button variant="ghost" size="xs" onClick={() => onFolderSelect("All Files")}>
            View all files
          </Button>
        )}
      </div>
      <CardContent className="p-0" aria-live="polite">
        <ScrollArea className="w-full max-h-[60vh]" type="auto">
        <div className="min-w-176">
        <Table>
          <caption className="sr-only">Document library</caption>
          <TableHeader>
            <TableRow>
              <TableHead
                scope="col"
                className="px-4"
              >
                <div className="flex items-center gap-1">
                  Name
                  <ArrowDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                scope="col"
                className="px-4"
              >
                Folder
              </TableHead>
              <TableHead
                scope="col"
                className="px-4"
              >
                Document type
              </TableHead>
              <TableHead
                scope="col"
                className="px-4"
              >
                Date Modified
              </TableHead>
              <TableHead
                scope="col"
                className="px-4 text-right"
              >
                Size
              </TableHead>
              <TableHead
                scope="col"
                className="px-4 text-right"
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>

            {page === 1 && selectedCategory === "All Files" && searchTerm === "" && (
              <>
                <TableRow>
                  <TableCell colSpan={6} className="px-4 py-3">
                    <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Folders
                    </p>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={6} className="px-4 py-0 pb-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {folders.map((folder) => (
                        <button
                          key={folder.name}
                          type="button"
                          onClick={() => onFolderSelect?.(folder.name)}
                          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-border-strong hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${toneSoft[FOLDER_TONES[folder.colorIdx % FOLDER_TONES.length]]}`}>
                            <Folder className="size-4" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{folder.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{folder.count} files</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              </>
            )}

            {paginatedDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-4 whitespace-normal">
                  {onClearFilters ? (
                    <EmptyState
                      title="No results for these filters"
                      description="Try a different search, folder, or document type."
                      action={{ label: "Clear filters", onClick: onClearFilters }}
                      className="min-h-0 border-0 bg-transparent"
                    />
                  ) : (
                    <EmptyState
                      title="No documents found"
                      description="Upload your first document to get started"
                      action={{ label: "Upload Document", onClick: onOpenUpload }}
                      className="min-h-0 border-0 bg-transparent"
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedDocuments.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  assignedCount={assignmentCounts?.[doc.id] ?? 0}
                  onDelete={onDelete}
                  onRequestMove={onMove ? handleRequestMove : undefined}
                  onRequestAssign={enableAssign ? handleRequestAssign : undefined}
                />
              ))
            )}
          </TableBody>
        </Table>
        </div>
        </ScrollArea>

        {totalFiltered > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground tabular-nums">
              Showing{" "}
              <strong className="text-foreground">
                {Math.min((page - 1) * pageSize + 1, totalFiltered)}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(page * pageSize, totalFiltered)}
              </strong>{" "}
              of <strong className="text-foreground">{totalFiltered}</strong> results
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {onMove && (
        <MoveToFolderSheet
          doc={moveTarget}
          folderOptions={folderOptions}
          onClose={() => setMoveTarget(null)}
          onMove={onMove}
        />
      )}
      {enableAssign && (
        <AssignDocumentSheet
          doc={assignTarget}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </Card>
  );
}

function MoveToFolderSheet({
  doc,
  folderOptions,
  onClose,
  onMove,
}: {
  doc: Document | null;
  folderOptions: string[];
  onClose: () => void;
  onMove: (documentId: number, folderName: string) => Promise<void>;
}) {
  const [folder, setFolder] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const currentFolder = doc?.category?.trim() || "";

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
        setFolder("");
      }
    },
    [onClose],
  );

  const handleSave = useCallback(async () => {
    if (!doc) return;
    const target = folder.trim();
    if (!target) {
      toast.error("Select a folder.");
      return;
    }
    if (target === currentFolder) {
      toast.info("Document is already in this folder.");
      return;
    }
    setIsSaving(true);
    try {
      await onMove(doc.id, target);
      toast.success(`Moved to "${target}".`);
      onClose();
      setFolder("");
    } catch {
      toast.error("Failed to move document.");
    } finally {
      setIsSaving(false);
    }
  }, [doc, folder, currentFolder, onMove, onClose]);

  return (
    <Sheet open={!!doc} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Move to folder</SheetTitle>
          <SheetDescription className="truncate">
            {doc ? doc.fileName || doc.name : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-2 py-4">
          <label className="text-xs font-medium text-muted-foreground">
            Destination folder
          </label>
          <SearchableCombobox
            options={folderOptions}
            value={folder}
            onValueChange={setFolder}
            placeholder="Select a folder…"
            searchPlaceholder="Search folders…"
            emptyMessage="No folders found."
            aria-label="Destination folder"
          />
          {currentFolder && (
            <p className="text-2xs text-muted-foreground">
              Currently in <span className="font-medium">{currentFolder}</span>.
            </p>
          )}
        </div>
        <SheetFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!folder} loading={isSaving}>
            Move document
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function AssignDocumentSheet({
  doc,
  onClose,
}: {
  doc: Document | null;
  onClose: () => void;
}) {
  const { data: employeeData, isLoading } = useHrEmployees(undefined, { enabled: !!doc });
  const { data: currentAssignments, isLoading: isLoadingAssignments } =
    useDocumentAssignments(doc?.id ?? null);
  const setAssignmentsMutation = useSetDocumentAssignments();
  const removeAssignmentsMutation = useRemoveDocumentAssignments();

  const [selected, setSelected] = useState<string[]>([]);
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const employees = useMemo(() => {
    if (!employeeData) return [];
    return isPaginatedEmployees(employeeData) ? employeeData.data : employeeData;
  }, [employeeData]);

  useEffect(() => {
    if (doc && currentAssignments) {
      const ids = currentAssignments.map((a) => a.userId);
      setOriginalIds(ids);
      setSelected(ids);
    }
  }, [doc, currentAssignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const name = (e.name || `${e.firstName ?? ""} ${e.lastName ?? ""}`).toLowerCase();
      return name.includes(q) || e.email.toLowerCase().includes(q);
    });
  }, [employees, search]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const reset = useCallback(() => {
    setSelected([]);
    setOriginalIds([]);
    setSearch("");
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
        reset();
      }
    },
    [onClose, reset],
  );

  const handleSave = useCallback(async () => {
    if (!doc) return;
    const toAdd = selected.filter((id) => !originalIds.includes(id));
    const toRemove = originalIds.filter((id) => !selected.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      if (toAdd.length > 0) {
        await setAssignmentsMutation.mutateAsync({ documentId: doc.id, userIds: toAdd });
      }
      if (toRemove.length > 0) {
        await removeAssignmentsMutation.mutateAsync({ documentId: doc.id, userIds: toRemove });
      }
      const parts: string[] = [];
      if (toAdd.length > 0) parts.push(`shared with ${toAdd.length}`);
      if (toRemove.length > 0) parts.push(`removed ${toRemove.length}`);
      toast.success(
        `Document ${parts.join(" and ")} employee${
          toAdd.length + toRemove.length === 1 ? "" : "s"
        }.`,
      );
      onClose();
      reset();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  }, [doc, selected, originalIds, setAssignmentsMutation, removeAssignmentsMutation, onClose, reset]);

  const hasChanges =
    selected.length !== originalIds.length ||
    selected.some((id) => !originalIds.includes(id));

  const loading = isLoading || isLoadingAssignments;

  return (
    <Sheet open={!!doc} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Assign / Share</SheetTitle>
          <SheetDescription className="truncate">
            Share {doc ? `"${doc.fileName || doc.name}"` : "this document"} with employees.
          </SheetDescription>
        </SheetHeader>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <Input
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search employees"
          />
        </div>
        <ScrollArea className="-mx-6 mt-3 flex-1 px-6" type="auto">
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading employees…
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-xs text-muted-foreground">No employees found.</p>
          ) : (
            <ul className="space-y-1 py-1">
              {filtered.map((e) => {
                const name = e.name || `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email;
                const checked = selected.includes(e.id);
                return (
                  <li key={e.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
                      <Checkbox checked={checked} onCheckedChange={() => toggle(e.id)} aria-label={`Select ${name}`} />
                      <Avatar className="h-7 w-7">
                        {e.image ? <AvatarImage src={e.image} alt={name} /> : null}
                        <AvatarFallback className="text-2xs">
                          {name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="truncate text-2xs text-muted-foreground">{e.email}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <SheetFooter className="mt-2 gap-2 sm:gap-0">
          <span className="mr-auto self-center text-xs text-muted-foreground tabular-nums">
            {selected.length} selected
          </span>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={loading || !hasChanges} loading={isSaving}>
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
