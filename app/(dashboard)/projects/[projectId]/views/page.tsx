"use client";

import { use, useState, useCallback, memo } from "react";
import {
  useViews,
  useCreateView,
  useUpdateView,
  useDeleteView,
} from "@/lib/api/hooks/projects";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptySearchIllustration } from "@/components/illustrations";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  LayoutGrid,
  List,
  Kanban,
  Pin,
  PinOff,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const LAYOUT_TYPES = ["board", "list", "table", "calendar", "gantt"] as const;

const createViewSchema = z.object({
  name: z.string().min(1, "Name is required"),
  layoutType: z.enum(LAYOUT_TYPES).default("board"),
});
type CreateViewForm = z.infer<typeof createViewSchema>;

const layoutIcons: Record<string, React.ReactNode> = {
  board: <Kanban className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
  table: <LayoutGrid className="h-4 w-4" />,
  calendar: <LayoutGrid className="h-4 w-4" />,
  gantt: <LayoutGrid className="h-4 w-4" />,
};

interface ViewItem {
  id: number;
  name: string;
  layoutType: string;
  isPinned: boolean;
  filters?: Record<string, unknown> | null;
}

interface ViewCardProps {
  view: ViewItem;
  isPinned: boolean;
  onNavigate: (view: ViewItem) => void;
  onTogglePin: (viewId: number, isPinned: boolean) => void;
  onDelete: (viewId: number) => void;
}

const ViewCard = memo(function ViewCard({
  view,
  isPinned,
  onNavigate,
  onTogglePin,
  onDelete,
}: ViewCardProps) {
  const handleNavigate = useCallback(() => onNavigate(view), [onNavigate, view]);
  const handleStopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const handleTogglePin = useCallback(
    () => onTogglePin(view.id, !isPinned),
    [onTogglePin, view.id, isPinned]
  );
  const handleDelete = useCallback(() => onDelete(view.id), [onDelete, view.id]);

  const filterCount = view.filters ? Object.keys(view.filters).length : 0;

  return (
    <Card
      className="hover:border-primary/50 transition-colors cursor-pointer"
      onClick={handleNavigate}
    >
      <CardContent className="py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 text-muted-foreground">
            {layoutIcons[view.layoutType] ?? layoutIcons.board}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{view.name}</p>
            <p className="text-xs text-muted-foreground">
              {view.layoutType.charAt(0).toUpperCase() +
                view.layoutType.slice(1)}{" "}
              {filterCount > 0 &&
                `with ${filterCount} filter${filterCount > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={handleStopPropagation}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTogglePin}
          >
            {isPinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
});

export default function ViewsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const { data: views, isLoading } = useViews(projectId);
  const createMutation = useCreateView();
  const togglePinMutation = useUpdateView();
  const deleteMutation = useDeleteView();

  const form = useForm<CreateViewForm>({
    resolver: zodResolver(createViewSchema) as unknown as Resolver<CreateViewForm>,
    defaultValues: { layoutType: "board" },
  });

  const onSubmit = (data: CreateViewForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          form.reset();
          toast.success("View created");
        },
        onError: (err) => toast.error((err as Error).message),
      }
    );
  };

  const handleNavigateToView = useCallback(
    (view: { id: number; layoutType: string }) => {
      const urlParams = new URLSearchParams();
      urlParams.set("viewId", view.id.toString());
      urlParams.set("view", view.layoutType);
      router.push(`/projects/${projectId}?${urlParams.toString()}`);
    },
    [router, projectId]
  );

  const handleTogglePin = useCallback(
    (viewId: number, isPinned: boolean) => {
      togglePinMutation.mutate(
        { id: viewId, projectId, isPinned },
        {
          onError: (err) => toast.error((err as Error).message),
        }
      );
    },
    [togglePinMutation, projectId]
  );

  const handleDelete = useCallback(
    (viewId: number) => {
      deleteMutation.mutate(
        { id: viewId, projectId },
        {
          onSuccess: () => toast.success("View deleted"),
          onError: (err) => toast.error((err as Error).message),
        }
      );
    },
    [deleteMutation, projectId]
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const pinnedViews = (views ?? []).filter((v) => v.isPinned);
  const unpinnedViews = (views ?? []).filter((v) => !v.isPinned);

  if (isLoading) {
    return (
      <PageWrapper title="Views">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Views"
           actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New View
            </Button>
          </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Create View</SheetTitle>
              </SheetHeader>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 p-4"
              >
                <div>
                  <Label htmlFor="view-name">Name</Label>
                  <Input id="view-name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Layout</Label>
                  <Controller
                    control={form.control}
                    name="layoutType"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LAYOUT_TYPES.map((l) => (
                            <SelectItem key={l} value={l}>
                              <span className="flex items-center gap-2">
                                {layoutIcons[l]}
                                {l.charAt(0).toUpperCase() + l.slice(1)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Filters can be applied from the board view after creation.
                </p>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending ? "Creating..." : "Create View"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
      }
    >
      <div className="space-y-6">
        {!views?.length ? (
          <EmptyState
            illustration={<EmptySearchIllustration className="h-32 w-32 opacity-95" />}
            title="No saved views"
            description="Create custom views with saved filters and layouts."
            action={{ label: "Create First View", onClick: handleOpenCreate }}
          />
        ) : (
          <>
            {pinnedViews.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Pinned
                </h2>
                <div className="space-y-2">
                  {pinnedViews.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view}
                      isPinned
                      onNavigate={handleNavigateToView}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}

            {unpinnedViews.length > 0 && (
              <section>
                {pinnedViews.length > 0 && (
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    All Views
                  </h2>
                )}
                <div className="space-y-2">
                  {unpinnedViews.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view}
                      isPinned={false}
                      onNavigate={handleNavigateToView}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
