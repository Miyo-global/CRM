"use client";

import { useState, useMemo, useCallback } from "react";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { FolderPlus, Upload, FilePlus2, FileText, Eye, Trash2, Globe, FolderOpen, Star, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  useHrDocuments,
  useDeleteDocument,
  useUpdateDocument,
  useHrDocumentStats,
  useRichDocuments,
  useDeleteRichDocument,
  useDocumentFolders,
  useCreateDocumentFolder,
} from "@/lib/api/hooks/hr";
import { BUILT_IN_CATEGORY_TABS, isCustomFolderTab } from "@/lib/hr/document-library-constants";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { Document } from "@/types/hr";

import { DocumentFilters, DOCUMENT_TYPES } from "@/features/hr/documents/document-filters";
import { DocumentExportSheet } from "@/features/hr/documents/document-export-sheet";
import { DocumentTable, type FolderItem } from "@/features/hr/documents/document-table";
import { NewFolderDialog } from "@/features/hr/documents/new-folder-dialog";
import { getErrorMessage } from "@/lib/get-error-message";

const DOCUMENT_CATEGORIES = [
  "Personal Documents",
  "Employment",
  "Compliance",
  "Training",
  "Financial",
  "Legal",
  "Other",
];

export default function DocumentsPage() {
  const { data: session } = useSession();
  const { page, pageSize, setPage, resetPage } = usePaginationParams();

  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState("All Files");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "ADMIN" || session?.user?.role === "HR";

  const typeFilter = selectedType !== "all" ? (selectedType as Document["type"]) : undefined;

  const { data: folderRows = [], refetch: refetchFolders } = useDocumentFolders();
  const createFolderMutation = useCreateDocumentFolder();
  const customFolderNames = useMemo(
    () => folderRows.map((f) => f.name),
    [folderRows],
  );

  const { data: rawDocuments = [], isLoading, refetch } = useHrDocuments(undefined, typeFilter);
  const { data: rawPolicies = [] } = useHrDocuments(undefined, "POLICY");
  const { data: statsData } = useHrDocumentStats();
  const deleteMutation = useDeleteDocument();
  const updateMutation = useUpdateDocument();

  const documents = rawDocuments as Document[];
  const policies = (rawPolicies as Document[]).filter((d) => d.isPublic);

  const defaultUploadCategory = useMemo(() => {
    if (isCustomFolderTab(selectedCategory, customFolderNames)) {
      return selectedCategory;
    }
    return "";
  }, [selectedCategory, customFolderNames]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchTerm === "" ||
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      if (selectedCategory !== "All Files") {
        const builtInMatch =
          (selectedCategory === "Contracts" && (doc.type === "CONTRACT" || doc.type === "OFFER_LETTER")) ||
          (selectedCategory === "Policies" && doc.type === "POLICY") ||
          (selectedCategory === "Tax Forms" && (doc.type === "ID_PROOF" || doc.tags?.some((t) => t.toLowerCase().includes("tax")))) ||
          (selectedCategory === "Templates" && doc.tags?.some((t) => t.toLowerCase().includes("template"))) ||
          (selectedCategory === "Payroll" && doc.type === "PAYSLIP");

        const customFolderMatch =
          isCustomFolderTab(selectedCategory, customFolderNames) &&
          (doc.category?.toLowerCase() === selectedCategory.toLowerCase() ||
            doc.tags?.some((t) => t.toLowerCase() === selectedCategory.toLowerCase()));

        if (!builtInMatch && !customFolderMatch) return false;
      }

      return matchesSearch;
    });
  }, [documents, searchTerm, selectedCategory, customFolderNames]);

  const totalFiltered = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedDocuments = filteredDocuments.slice((page - 1) * pageSize, page * pageSize);

  const builtInFolders: FolderItem[] = [
    { name: "Contracts", count: documents.filter((d) => d.type === "CONTRACT" || d.type === "OFFER_LETTER").length, colorIdx: 0 },
    { name: "Policies", count: policies.length, colorIdx: 1 },
    { name: "Tax Forms", count: documents.filter((d) => d.type === "ID_PROOF" || d.tags?.some((t) => t.toLowerCase().includes("tax"))).length, colorIdx: 2 },
    { name: "Payroll", count: documents.filter((d) => d.type === "PAYSLIP").length, colorIdx: 3 },
  ];

  const customFolderItems: FolderItem[] = customFolderNames.map((name, i) => ({
    name,
    count: documents.filter(
      (d) =>
        d.category?.toLowerCase() === name.toLowerCase() ||
        d.tags?.some((t) => t.toLowerCase() === name.toLowerCase()),
    ).length,
    colorIdx: (builtInFolders.length + i) % 4,
  }));

  const folders: FolderItem[] = [...builtInFolders, ...customFolderItems];

  const totalStorageBytes = documents.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
  const maxStorageGB = 20;
  const usedGB = totalStorageBytes / (1024 * 1024 * 1024);
  const storagePercent = Math.min(100, Math.round((usedGB / maxStorageGB) * 100));

  const handleDelete = useCallback(async (documentId: number) => {
    await toast.promise(
      deleteMutation.mutateAsync(documentId),
      {
        loading: "Deleting document...",
        success: "Document deleted",
        error: "Failed to delete document",
      }
    );
  }, [deleteMutation]);

  const folderOptions = useMemo(
    () =>
      Array.from(
        new Set([...DOCUMENT_CATEGORIES, ...customFolderNames].filter(Boolean)),
      ),
    [customFolderNames],
  );

  const handleMove = useCallback(
    async (documentId: number, folderName: string) => {
      await updateMutation.mutateAsync({ id: documentId, category: folderName });
    },
    [updateMutation],
  );

  const handleSearchChange = (value: string) => { setSearchTerm(value); resetPage(); };
  const handleTypeChange = (value: string) => { setSelectedType(value); resetPage(); };
  const handleCategoryChange = (value: string) => { setSelectedCategory(value); resetPage(); };

  const handleNewFolder = useCallback(
    (name: string) => {
      createFolderMutation.mutate(
        { name },
        {
          onSuccess: (folder) => {
            void refetchFolders();
            setSelectedCategory(folder.name);
            setNewFolderName("");
            setIsNewFolderOpen(false);
            toast.success(`Folder "${folder.name}" created`);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [createFolderMutation, refetchFolders],
  );

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Skeleton className="h-10 w-[120px] rounded-md" />
            <Skeleton className="h-10 w-[160px] rounded-md" />
          </div>
        </div>
        <Card className="shadow-sm border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-10 flex-1 min-w-[200px] max-w-md rounded-md" />
              {BUILT_IN_CATEGORY_TABS.map((tab) => (
                <Skeleton key={tab} className="h-8 rounded-full" style={{ width: `${tab.length * 9 + 24}px` }} />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const pageActions = (
    <div className="flex items-center gap-2">
      <DocumentExportSheet
        isDocumentsAdmin={!!isAdmin}
        canEmailPack={!!isAdmin}
        initialType={selectedType}
        initialCategory={selectedCategory}
        documents={documents}
      />
      <Button variant="outline" size="sm" className="gap-2" asChild>
        <Link href="/hr/documents/templates"><LayoutTemplate className="h-4 w-4" /><span className="hidden sm:inline">Templates</span></Link>
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsNewFolderOpen(true)}>
        <FolderPlus className="h-4 w-4" /><span className="hidden sm:inline">New Folder</span>
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsUploadOpen(true)}>
        <Upload className="h-4 w-4" /><span className="hidden sm:inline">Upload</span>
      </Button>
      <Button size="sm" className="gap-2" asChild>
        <Link href="/hr/documents/editor/new"><FilePlus2 className="h-4 w-4" /><span className="hidden sm:inline">Create Document</span></Link>
      </Button>
    </div>
  );

  return (
    <PageWrapper
      title="Document Library"
      subtitle="Centralized repository for all company-wide HR documents, contracts, and policy files."
      actions={pageActions}
      filters={
        <DocumentFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          customFolderNames={customFolderNames}
          storagePercent={storagePercent}
          maxStorageGB={maxStorageGB}
          usedStorageGB={usedGB}
        />
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total Documents" value={documents.length} icon={FileText} color="blue" />
          <StatCard label="Folders" value={folders.length} icon={FolderOpen} color="gold" />
          <StatCard label="Public Documents" value={documents.filter((d) => d.isPublic).length} icon={Star} color="purple" />
        </div>

        <DocumentTable
          paginatedDocuments={paginatedDocuments}
          folders={folders}
          page={page}
          pageSize={pageSize}
          totalFiltered={totalFiltered}
          totalPages={totalPages}
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
          folderOptions={folderOptions}
          onPageChange={setPage}
          onDelete={handleDelete}
          onOpenUpload={() => setIsUploadOpen(true)}
          onFolderSelect={handleCategoryChange}
          onMove={handleMove}
          enableAssign
        />

        <RichDocumentsSection />

        <UploadDocumentDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onSuccess={() => { void refetch(); setIsUploadOpen(false); }}
          documentTypes={DOCUMENT_TYPES}
          categories={[...DOCUMENT_CATEGORIES, ...customFolderNames]}
          defaultCategory={defaultUploadCategory}
          isAdmin={isAdmin}
        />
        <NewFolderDialog
          open={isNewFolderOpen}
          onOpenChange={setIsNewFolderOpen}
          folderName={newFolderName}
          onFolderNameChange={setNewFolderName}
          existingTabs={[...BUILT_IN_CATEGORY_TABS, ...customFolderNames]}
          onConfirm={handleNewFolder}
        />
      </div>
    </PageWrapper>
  );
}

function RichDocumentsSection() {
  const { data: richDocs, isLoading } = useRichDocuments();
  const deleteMutation = useDeleteRichDocument();

  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Document deleted"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteMutation]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!richDocs?.length) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Created Documents</h3>
          <span className="text-xs text-muted-foreground">{richDocs.length} documents</span>
        </div>
        <div className="space-y-2">
          {richDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {doc.templateType && (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        {doc.templateType}
                      </Badge>
                    )}
                    {doc.isPublished && (
                      <Badge variant="default" className="gap-0.5 px-1.5 py-0 text-[10px]">
                        <Globe className="h-2.5 w-2.5" aria-hidden />
                        Published
                      </Badge>
                    )}
                    {doc.updatedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 sm:pl-2">
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link href={`/hr/documents/editor/${doc.id}`} aria-label={`View ${doc.title}`}>
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    View
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Delete ${doc.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:mr-1" aria-hidden />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
