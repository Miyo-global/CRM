"use client";

import { use, useState, useMemo, useCallback, memo } from "react";
import { usePages, useCreatePage, useUpdatePage } from "@/lib/api/hooks/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { cn } from "@/lib/utils";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Pin,
  PinOff,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const createPageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  icon: z.string().optional(),
});
type CreatePageForm = z.infer<typeof createPageSchema>;

interface ProjectPage {
  id: number;
  title: string;
  icon: string | null;
  content: unknown;
  parentPageId: number | null;
  isPinned: boolean;
  children?: ProjectPage[];
}

function buildTree(pages: ProjectPage[]): ProjectPage[] {
  const map = new Map<number, ProjectPage>();
  const roots: ProjectPage[] = [];

  for (const page of pages) {
    map.set(page.id, { ...page, children: [] });
  }

  for (const page of pages) {
    const node = map.get(page.id)!;
    if (page.parentPageId && map.has(page.parentPageId)) {
      map.get(page.parentPageId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function PageTreeItem({
  page,
  depth,
  activePage,
  onSelect,
  onTogglePin,
}: {
  page: ProjectPage;
  depth: number;
  activePage: number | null;
  onSelect: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (page.children?.length ?? 0) > 0;
  const isActive = activePage === page.id;

  const handleSelect = useCallback(() => onSelect(page.id), [onSelect, page.id]);

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded((v) => !v);
    },
    []
  );

  const handleTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin(page.id, !page.isPinned);
    },
    [onTogglePin, page.id, page.isPinned]
  );

  return (
    <div>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 transition-colors",
          isActive ? "bg-brand-soft text-brand-soft-foreground" : "hover:bg-muted",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {hasChildren ? (
          <button
            onClick={handleToggleExpand}
            className="flex size-5 shrink-0 items-center justify-center rounded-sm focus-visible:focus-ring"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <span className="text-base shrink-0">{page.icon ?? "📄"}</span>
        <span className="flex-1 truncate text-sm" title={page.title}>{page.title}</span>
        <button
          onClick={handleTogglePin}
          className="shrink-0 rounded-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:focus-ring pointer-coarse:opacity-100"
          aria-label={page.isPinned ? "Unpin page" : "Pin page"}
        >
          {page.isPinned ? (
            <PinOff className="size-3.5 text-muted-foreground" />
          ) : (
            <Pin className="size-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
      {expanded &&
        hasChildren &&
        page.children!.map((child) => (
          <PageTreeItem
            key={child.id}
            page={child}
            depth={depth + 1}
            activePage={activePage}
            onSelect={onSelect}
            onTogglePin={onTogglePin}
          />
        ))}
    </div>
  );
}

interface PinnedPageItemProps {
  page: ProjectPage;
  activePage: number | null;
  onSelect: (id: number) => void;
}

const PinnedPageItem = memo(function PinnedPageItem({
  page,
  activePage,
  onSelect,
}: PinnedPageItemProps) {
  const handleClick = useCallback(() => onSelect(page.id), [onSelect, page.id]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        activePage === page.id ? "bg-brand-soft text-brand-soft-foreground" : "hover:bg-muted",
      )}
    >
      <Pin className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="shrink-0 text-base">{page.icon ?? "📄"}</span>
      <span className="truncate text-sm" title={page.title}>{page.title}</span>
    </div>
  );
});

export default function PagesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);
  const [activePage, setActivePage] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: pages, isLoading, isError, error, refetch } = usePages(projectId);

  const createMutation = useCreatePage();
  const updateMutation = useUpdatePage();
  const togglePinMutation = useUpdatePage();

  const form = useForm<CreatePageForm>({
    resolver: zodResolver(createPageSchema),
  });

  const onSubmit = (data: CreatePageForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          form.reset();
          toast.success("Page created");
        },
        onError: (err) => toast.error((err as Error).message),
      }
    );
  };

  const mappedPages: ProjectPage[] = useMemo(() => (pages ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    icon: p.icon,
    content: p.content,
    parentPageId: p.parentPageId,
    isPinned: p.isPinned,
  })), [pages]);
  const tree = useMemo(() => buildTree(mappedPages), [mappedPages]);
  const pinnedPages = useMemo(
    () => mappedPages.filter((p) => p.isPinned),
    [mappedPages]
  );
  const selectedPage = useMemo(
    () => mappedPages.find((p) => p.id === activePage),
    [mappedPages, activePage]
  );

  const handleSelectPage = useCallback((pageId: number) => {
    setActivePage((prev) => {
      if (prev !== null) {
        const target = (pages ?? []).find((p) => p.id === prev);
        const prevContent = typeof target?.content === "string"
          ? target.content
          : JSON.stringify(target?.content ?? "");
        // We capture editContent via closure but need a functional approach.
        // Use the setter only; auto-save on unmount is handled separately.
      }
      return pageId;
    });
    const target = (pages ?? []).find((p) => p.id === pageId);
    setEditContent(typeof target?.content === "string" ? target.content : JSON.stringify(target?.content ?? ""));
  }, [pages]);

  const handleTogglePin = useCallback((pageId: number, pinned: boolean) => {
    togglePinMutation.mutate(
      { id: pageId, projectId, isPinned: pinned },
      { onError: (err) => toast.error((err as Error).message) }
    );
  }, [togglePinMutation, projectId]);

  const handleSave = useCallback(() => {
    if (activePage === null) return;
    updateMutation.mutate(
      { id: activePage, projectId, content: editContent },
      {
        onSuccess: () => toast.success("Page saved"),
        onError: (err) => toast.error((err as Error).message),
      }
    );
  }, [activePage, projectId, editContent, updateMutation]);

  const handleEditContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value),
    []
  );

  const handleOpenCreatePage = useCallback(() => setCreateOpen(true), []);

  if (isLoading) {
    return (
      <PageWrapper title="Pages" noInternalScroll contentClassName="p-0">
        <div className="flex h-full">
          <div className="hidden w-64 space-y-2 border-r border-border p-4 md:block">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Pages"
      actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" aria-hidden="true" /> New Page
            </Button>
          </SheetTrigger>
          <SheetContent side="right" size="sm" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Create Page</SheetTitle>
            </SheetHeader>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 p-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="page-title">Title</Label>
                <Input id="page-title" {...form.register("title")} />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="page-icon">Icon Emoji</Label>
                <Input
                  id="page-icon"
                  placeholder="📄"
                  maxLength={4}
                  {...form.register("icon")}
                />
              </div>
              <Button
                type="submit"
                loading={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? "Creating..." : "Create Page"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      }
      noInternalScroll
      contentClassName="p-0"
    >
      {isError ? (
        <div className="p-4 sm:p-6">
          <QueryErrorState error={error} onRetry={refetch} />
        </div>
      ) : !pages?.length ? (
        <div className="p-4 sm:p-6">
          <EmptyState
            title="No pages yet"
            description="Create your first page to start documenting your project."
            action={{ label: "Create First Page", onClick: handleOpenCreatePage }}
          />
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden md:flex-row">
          <nav
            aria-label="Pages"
            className="max-h-56 shrink-0 space-y-1 overflow-y-auto border-b border-border bg-surface-sunken/40 p-3 md:max-h-none md:w-64 md:border-r md:border-b-0"
          >
            {pinnedPages.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 px-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pinned
                </p>
                {pinnedPages.map((page) => (
                  <PinnedPageItem
                    key={`pin-${page.id}`}
                    page={page}
                    activePage={activePage}
                    onSelect={handleSelectPage}
                  />
                ))}
                <div className="my-2 border-b border-border" />
              </div>
            )}
            {tree.map((page) => (
              <PageTreeItem
                key={page.id}
                page={page}
                depth={0}
                activePage={activePage}
                onSelect={handleSelectPage}
                onTogglePin={handleTogglePin}
              />
            ))}
          </nav>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {selectedPage ? (
              <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="flex min-w-0 items-center gap-2 font-display text-xl font-bold">
                    <span className="shrink-0 text-2xl">
                      {selectedPage.icon ?? "📄"}
                    </span>
                    <span className="truncate">{selectedPage.title}</span>
                  </h2>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    loading={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
                <Textarea
                  className="min-h-96 flex-1 resize-none font-mono text-sm"
                  placeholder="Start writing..."
                  value={editContent}
                  onChange={handleEditContentChange}
                />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
                <EmptyState
                  compact
                  className="border-0 bg-transparent"
                  title="Select a page"
                  description="Choose a page from the list to start editing"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
