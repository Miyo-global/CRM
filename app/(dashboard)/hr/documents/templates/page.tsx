"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  FileText,
  FilePlus2,
  Pencil,
  Trash2,
  Eye,
  ArrowLeft,
  FileCheck,
  FileLock,
  FileKey,
  Smile,
  MoreHorizontal,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  useDocumentTemplates,
  useDeleteDocumentTemplate,
  type DocumentTemplate,
} from "@/lib/api/hooks/hr/document-templates";
import { getErrorMessage } from "@/lib/get-error-message";


const TYPE_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  OFFER_LETTER: {
    label: "Offer Letter",
    className: "bg-gold/10 text-gold border-gold/20",
    icon: FileCheck,
  },
  NDA: {
    label: "NDA",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: FileLock,
  },
  POLICY: {
    label: "Policy",
    className: "bg-blue/10 text-blue border-blue/20",
    icon: FileKey,
  },
  WELCOME: {
    label: "Welcome",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: Smile,
  },
  OTHER: {
    label: "Other",
    className: "bg-muted text-muted-foreground border-border",
    icon: FileText,
  },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.OTHER;
}


function VariableChips({ variables }: { variables: string[] }) {
  const visible = variables.slice(0, 3);
  const rest = variables.length - 3;
  if (!variables.length) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((v) => (
        <span
          key={v}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60"
        >
          {`{{${v}}}`}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/50 text-muted-foreground border border-border/40">
          +{rest} more
        </span>
      )}
    </div>
  );
}


function PreviewDialog({ template }: { template: DocumentTemplate }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Eye className="mr-2 h-3.5 w-3.5" />
        Preview
      </DropdownMenuItem>

      {open && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Preview — {template.title}</AlertDialogTitle>
              <AlertDialogDescription>
                Raw HTML preview with variable tokens shown as-is.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div
              className="max-h-[60vh] overflow-y-auto rounded-md border bg-white dark:bg-neutral-950 p-4 text-sm prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(template.htmlContent) }}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}


function DeleteConfirm({
  template,
  onDelete,
  isPending,
}: {
  template: DocumentTemplate;
  onDelete: (id: number) => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => e.preventDefault()}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate template?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{template.title}&rdquo; will be hidden from rollout and marked inactive.
            Existing generated documents are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onDelete(template.id)}
            disabled={isPending}
          >
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


function TemplatesPageSkeleton() {
  return (
    <PageWrapper
      title="Document Templates"
      subtitle="Manage reusable HTML templates for offer letters, NDAs, and policies."
      actions={<Skeleton className="h-8 w-[140px] rounded-md" />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-10" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 border-b">
            {["Title", "Type", "Variables", "Version", "Status", "Created"].map((h) => (
              <Skeleton key={h} className="h-3" style={{ width: `${h.length * 9}px` }} />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b last:border-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-7 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}


export default function DocumentTemplatesPage() {
  const router = useRouter();
  const { data: templates, isLoading } = useDocumentTemplates();
  const deleteMutation = useDeleteDocumentTemplate();

  const handleDelete = useCallback(
    (id: number) => {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Template deactivated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteMutation]
  );

  if (isLoading) return <TemplatesPageSkeleton />;

  const list = templates ?? [];

  const total = list.length;
  const active = list.filter((t) => t.isActive).length;
  const ndaCount = list.filter((t) => t.type === "NDA").length;
  const offerCount = list.filter((t) => t.type === "OFFER_LETTER").length;

  return (
    <PageWrapper
      title="Document Templates"
      subtitle="Manage reusable HTML templates for offer letters, NDAs, and policies."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/documents">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Documents
            </Link>
          </Button>
          <Button size="sm" className="gap-2" asChild>
            <Link href="/hr/documents/templates/new">
              <FilePlus2 className="h-4 w-4" />
              Add Template
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Templates" value={total} icon={FileText} color="blue" index={0} />
          <StatCard label="Active" value={active} icon={FileCheck} color="green" index={1} />
          <StatCard label="NDAs" value={ndaCount} icon={FileLock} color="red" index={2} />
          <StatCard label="Offer Letters" value={offerCount} icon={FileKey} color="gold" index={3} />
        </div>

        {list.length === 0 ? (
          <EmptyState
            illustration={<EmptyDocumentsIllustration className="h-40 w-40" />}
            title="No templates yet"
            description="Create your first document template to automate offer letters, NDAs, and more."
            action={{ label: "Create your first template", href: "/hr/documents/templates/new" }}
          />
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[780px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[48px] text-center">#</TableHead>
                      <TableHead className="w-[220px]">Title</TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead className="w-[80px] text-center">Version</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                      <TableHead className="w-[120px]">Created</TableHead>
                      <TableHead className="w-[56px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((template, index) => {
                      const cfg = getTypeConfig(template.type);
                      const TypeIcon = cfg.icon;
                      return (
                        <TableRow key={template.id}>
                          <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm truncate">{template.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[11px] px-2 py-0.5 ${cfg.className}`}
                            >
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <VariableChips variables={template.variables ?? []} />
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            v{template.version}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                template.isActive
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]"
                                  : "bg-muted text-muted-foreground border-border text-[11px]"
                              }
                            >
                              {template.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {template.createdAt
                              ? format(new Date(template.createdAt), "MMM d, yyyy")
                              : ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label="Template actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/hr/documents/templates/${template.id}/edit`)
                                  }
                                >
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Edit
                                </DropdownMenuItem>
                                <PreviewDialog template={template} />
                                <DropdownMenuSeparator />
                                <DeleteConfirm
                                  template={template}
                                  onDelete={handleDelete}
                                  isPending={deleteMutation.isPending}
                                />
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
