"use client";

import { useState, useCallback, memo } from "react";
import Link from "next/link";
import { Plus, ExternalLink, Trash2, Pencil, FileText, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCrmPages, useUpdateCrmPage, useDeleteCrmPage, type CrmPage } from "@/lib/api/hooks/marketing";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";


interface PageRowProps {
  page: CrmPage;
  onTogglePublish: (page: CrmPage) => void;
  onDelete: (id: number) => void;
}

const PageRow = memo(function PageRow({ page, onTogglePublish, onDelete }: PageRowProps) {
  const handleToggle = useCallback(() => onTogglePublish(page), [onTogglePublish, page]);
  const handleDelete = useCallback(() => onDelete(page.id), [onDelete, page.id]);

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{page.title ?? page.name}</p>
          {page.isPublished ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent text-xs"><CheckCircle2 className="mr-1 h-3 w-3" />Live</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground"><Clock className="mr-1 h-3 w-3" />Draft</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">/{page.slug ?? ""}{page.description && <span className="ml-2 truncate">{page.description}</span>}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {page.isPublished && page.slug && (<Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" aria-label="View live"><ExternalLink className="h-3.5 w-3.5" /></a></Button>)}
        <Switch checked={page.isPublished ?? false} onCheckedChange={handleToggle} aria-label={`Toggle publish for ${page.title}`} className="scale-75" />
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link href={`/marketing/landing-pages/${page.id}/edit`} aria-label="Edit page"><Pencil className="h-3.5 w-3.5" /></Link></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete} aria-label="Delete page"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
});


export function CrmHostedPagesTab() {
  const { data: pages, isLoading } = useCrmPages();
  const updatePage = useUpdateCrmPage();
  const deletePage = useDeleteCrmPage();
  const [deleteCrmId, setDeleteCrmId] = useState<number | null>(null);
  const handleTogglePublish = useCallback((page: CrmPage) => {
    updatePage.mutate({ id: page.id, isPublished: !page.isPublished }, {
      onSuccess: () => toast.success(page.isPublished ? "Page unpublished." : "Page published."),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updatePage]);
  const handleDeleteCrm = useCallback(() => {
    if (!deleteCrmId) return;
    deletePage.mutate(deleteCrmId, {
      onSuccess: () => { toast.success("Page archived."); setDeleteCrmId(null); },
      onError: (e) => { toast.error(getErrorMessage(e)); setDeleteCrmId(null); },
    });
  }, [deleteCrmId, deletePage]);
  const handleAlertOpenChange = useCallback((o: boolean) => {
    if (!o) setDeleteCrmId(null);
  }, []);
  const crmPages: CrmPage[] = pages ?? [];
  return (
    <>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-lg" />))}</div>
      ) : crmPages.length === 0 ? (
        <EmptyState
          compact
          icon={FileText}
          title="No hosted pages yet"
          description="Create a landing page hosted directly on your CRM."
          action={{ label: "Create First Page", href: "/marketing/landing-pages/new" }}
          className="border-0 bg-transparent"
        />
      ) : (
        <div className="space-y-3">
          {crmPages.map((page) => (
            <PageRow
              key={page.id}
              page={page}
              onTogglePublish={handleTogglePublish}
              onDelete={setDeleteCrmId}
            />
          ))}
        </div>
      )}
      <AlertDialog open={deleteCrmId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Page?</AlertDialogTitle>
            <AlertDialogDescription>This will unpublish and archive the page. It will no longer be publicly accessible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCrm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
