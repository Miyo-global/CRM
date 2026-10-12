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
import { StatsStrip } from "@/components/shared/stats-strip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import type { Tone } from "@/lib/design/tones";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
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

import {
  useDocumentTemplates,
  useDeleteDocumentTemplate,
  type DocumentTemplate,
} from "@/lib/api/hooks/hr/document-templates";
import { getErrorMessage } from "@/lib/get-error-message";


const TYPE_CONFIG: Record<
  string,
  { label: string; tone: Tone; icon: React.ComponentType<{ className?: string }> }
> = {
  OFFER_LETTER: { label: "Offer Letter", tone: "brand", icon: FileCheck },
  NDA: { label: "NDA", tone: "danger", icon: FileLock },
  POLICY: { label: "Policy", tone: "info", icon: FileKey },
  WELCOME: { label: "Welcome", tone: "success", icon: Smile },
  OTHER: { label: "Other", tone: "neutral", icon: FileText },
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
          className="inline-flex items-center rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-2xs text-muted-foreground"
        >
          {`{{${v}}}`}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center rounded-xs px-1.5 py-0.5 text-2xs text-muted-foreground tabular-nums">
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
              className="max-h-[60vh] overflow-y-auto rounded-md border bg-card p-4 tiptap"
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
          className="text-danger-strong focus:text-danger-strong"
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
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
    >
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-lg" />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center gap-4 overflow-hidden border-b border-border bg-surface-sunken px-4 py-3">
            {["Title", "Type", "Variables", "Version", "Status", "Created"].map((h) => (
              <Skeleton key={h} className="h-3" style={{ width: `${h.length * 9}px` }} />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 overflow-hidden border-b border-border px-4 py-4 last:border-0">
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
  const { data: templates, isLoading, isError, error, refetch } = useDocumentTemplates();
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
              <ArrowLeft className="size-4" aria-hidden />
              Back to Documents
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/hr/documents/templates/new">
              <FilePlus2 className="size-4" aria-hidden />
              Add Template
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <StatsStrip
          items={[
            { label: "Total Templates", value: total, icon: FileText },
            { label: "Active", value: active, icon: FileCheck, tone: "success" },
            { label: "NDAs", value: ndaCount, icon: FileLock },
            { label: "Offer Letters", value: offerCount, icon: FileKey },
          ]}
        />

        {isError ? (
          <QueryErrorState title="Couldn't load templates" error={error} onRetry={() => void refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No templates yet"
            description="Create your first document template to automate offer letters, NDAs, and more."
            action={{ label: "Create your first template", href: "/hr/documents/templates/new" }}
          />
        ) : (
                <Table className="min-w-196">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="w-56">Title</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead className="w-20 text-center">Version</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-32">Created</TableHead>
                      <TableHead className="w-14" />
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
                            <div className="flex items-center gap-2.5 min-w-0">
                              <IconChip icon={TypeIcon} tone={cfg.tone} size="sm" />
                              <span className="font-medium text-sm truncate" title={template.title}>{template.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={cfg.tone}>{cfg.label}</StatusPill>
                          </TableCell>
                          <TableCell>
                            <VariableChips variables={template.variables ?? []} />
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                            v{template.version}
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={template.isActive ? "success" : "neutral"} dot>
                              {template.isActive ? "Active" : "Inactive"}
                            </StatusPill>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {template.createdAt
                              ? format(new Date(template.createdAt), "MMM d, yyyy")
                              : ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
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
        )}
      </div>
    </PageWrapper>
  );
}
