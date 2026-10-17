"use client";

import { use, useState } from "react";
import {
  useProject,
  useUpdateTicket,
  useDeleteTicket,
  useCreateTicket,
} from "@/lib/api/hooks/projects";
import { CreateEpicDialog } from "@/components/projects/create-epic-dialog";
import { EditEpicDialog } from "@/components/projects/edit-epic-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import { toneBar, toneDot, type Tone } from "@/lib/design/tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, ChevronDown, ChevronRight, CheckCircle2, Loader2, BookOpen, Wrench, Pencil, Trash2, Plus, Link2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getColorSafe, priorityColors } from "@/lib/theme-constants";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const STORY_STATUS_TONE: Record<string, Tone> = {
  DONE: "success",
  IN_PROGRESS: "info",
  IN_REVIEW: "plum",
  BLOCKED: "danger",
};

function storyStatusTone(status: string | null): Tone {
  return STORY_STATUS_TONE[status ?? ""] ?? "neutral";
}

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function EpicsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const { data: project, isLoading, isError, error, refetch } = useProject(projectId);

  const updateTicket = useUpdateTicket(projectId);
  const deleteTicket = useDeleteTicket(projectId);
  const createTicket = useCreateTicket();

  if (isLoading) {
    return (
      <PageWrapper title="Epics">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Epics">
        <QueryErrorState error={error} onRetry={refetch} />
      </PageWrapper>
    );
  }

  const tickets = project?.tickets || [];
  const epics = tickets.filter(t => t.type === "EPIC");
  const stories = tickets.filter(t => t.type === "STORY");
  const tasks = tickets.filter(t => t.type === "TASK");

  function handleDeleteEpic(epicId: number) {
    const children = stories.filter(s => s.epicId === epicId);
    const unlinkPromises = children.map(s =>
      updateTicket.mutateAsync({ ticketId: s.id, epicId: undefined })
    );
    Promise.all(unlinkPromises)
      .then(() => {
        deleteTicket.mutate(
          { ticketId: epicId },
          {
            onSuccess: () => toast.success("Epic deleted"),
            onError: (error) => toast.error(getErrorMessage(error)),
          }
        );
      })
      .catch(() => {
        toast.error("Failed to unlink stories from epic");
      });
  }

  return (
    <PageWrapper
      title="Epics"
      subtitle={`${epics.length} epic${epics.length !== 1 ? "s" : ""} — ${stories.length} stories, ${tickets.filter(t => t.status === "DONE").length} completed`}
      actions={<CreateEpicDialog projectId={projectId} />}
    >
      <div className="space-y-6" aria-live="polite" aria-atomic="true">

      <StatsStrip
        items={[
          { label: "Epics", value: epics.length, tone: "plum", icon: Layers },
          { label: "Stories", value: stories.length, tone: "info", icon: BookOpen },
          { label: "Tasks", value: tasks.length, icon: Wrench },
          { label: "Completed", value: tickets.filter(t => t.status === "DONE").length, tone: "success", icon: CheckCircle2 },
        ]}
      />

      <div className="space-y-4">
        {epics.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <EmptyState
              title="No epics yet"
              description="Create your first epic to organize related stories and tasks."
              className="w-full"
            />
            <CreateEpicDialog projectId={projectId} />
          </div>
        ) : (
          epics.map((epic) => (
            <EpicCard
              key={epic.id}
              epic={epic}
              stories={stories.filter(s => s.epicId === epic.id)}
              allTickets={tickets}
              projectId={projectId}
              unlinkedStories={stories.filter(s => !s.epicId)}
              onDeleteEpic={() => handleDeleteEpic(epic.id)}
              onLinkStory={(storyId) => updateTicket.mutate({ ticketId: storyId, epicId: epic.id })}
              onCreateStory={(title) =>
                createTicket.mutate(
                  { projectId, title, type: "STORY", epicId: epic.id },
                  {
                    onSuccess: () => toast.success("Story created"),
                    onError: (error) => toast.error(getErrorMessage(error)),
                  }
                )
              }
              isDeleting={deleteTicket.isPending}
              isCreatingStory={createTicket.isPending}
            />
          ))
        )}
      </div>

      {stories.filter(s => !s.epicId).length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            Stories without Epic
          </h2>
          <Card>
            <CardContent className="py-4">
              <div className="divide-y divide-border">
                {stories.filter(s => !s.epicId).map((story) => (
                  <div
                    key={story.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <BookOpen className="size-4 shrink-0 text-info-strong" aria-hidden="true" />
                      <span className="truncate font-medium" title={story.title}>{story.title}</span>
                      <StatusPill tone={storyStatusTone(story.status)}>{story.status}</StatusPill>
                    </div>
                    <Link href={`/projects/${projectId}?ticket=${story.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
      </div>
    </PageWrapper>
  );
}

interface EpicCardProps {
  epic: {
    id: number;
    title: string;
    description?: string | null;
    status: string | null;
    priority?: string | null;
    points?: number | null;
  };
  stories: Array<{
    id: number;
    title: string;
    status: string | null;
    points?: number | null;
    epicId?: number | null;
  }>;
  allTickets: Array<{
    id: number;
    title: string;
    status: string | null;
    type: string | null;
    epicId?: number | null;
    points?: number | null;
  }>;
  projectId: number;
  unlinkedStories: Array<{ id: number; title: string }>;
  onDeleteEpic: () => void;
  onLinkStory: (storyId: number) => void;
  onCreateStory: (title: string) => void;
  isDeleting?: boolean;
  isCreatingStory?: boolean;
}

function EpicCard({ epic, stories, projectId, unlinkedStories, onDeleteEpic, onLinkStory, onCreateStory, isDeleting, isCreatingStory }: EpicCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  const totalItems = stories.length;
  const completedItems = stories.filter(s => s.status === "DONE").length;
  const inProgressItems = stories.filter(s => s.status === "IN_PROGRESS" || s.status === "IN_REVIEW").length;
  const todoItems = totalItems - completedItems - inProgressItems;

  const totalPoints = stories.reduce((sum, s) => sum + (s.points || 0), 0);
  const completedPoints = stories.filter(s => s.status === "DONE").reduce((sum, s) => sum + (s.points || 0), 0);

  const epicCardId = `epic-stories-${epic.id}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer rounded-t-lg transition-colors hover:bg-muted/50 focus-visible:focus-ring"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={epicCardId}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsExpanded(!isExpanded); } }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <Button variant="ghost" size="icon-xs" className="mt-0.5 shrink-0" aria-label={isExpanded ? "Collapse epic" : "Expand epic"}>
              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
            <div className="min-w-0 space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Layers className="size-5 shrink-0 text-plum-strong" aria-hidden="true" />
                <span className="truncate">{epic.title}</span>
              </CardTitle>
              {epic.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{epic.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Badge variant="outline" className={cn("border-transparent", getColorSafe(priorityColors, epic.priority || "MEDIUM"))}>
              {epic.priority || "MEDIUM"}
            </Badge>
            <EditEpicDialog epic={epic} projectId={projectId} trigger={
              <Button variant="ghost" size="icon-xs" aria-label={`Edit ${epic.title}`}>
                <Pencil className="size-3.5" />
              </Button>
            } />
            <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${epic.title}`} onClick={() => setDeleteConfirm(true)} loading={isDeleting}>
              <Trash2 className="size-3.5" />
            </Button>
            <ConfirmDialog
              open={deleteConfirm}
              onOpenChange={setDeleteConfirm}
              title="Delete epic?"
              description="Delete this epic? Child stories will be unlinked."
              confirmLabel="Delete"
              destructive
              onConfirm={onDeleteEpic}
            />
          </div>
        </div>

        <div className="ml-9 mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 text-sm tabular-nums">
            <span className="text-muted-foreground">
              {completedItems} of {totalItems} stories completed
            </span>
            <span className="text-muted-foreground">
              {completedPoints} / {totalPoints} points
            </span>
          </div>
          <div
            className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Epic progress: ${completedItems} of ${totalItems} stories completed`}
            aria-valuetext={`${totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}% complete, ${completedItems} of ${totalItems} stories done`}
          >
            {totalItems > 0 && (
              <>
                <div
                  className={cn("h-full transition-all", toneBar.success)}
                  style={{ width: `${(completedItems / totalItems) * 100}%` }}
                />
                <div
                  className={cn("h-full transition-all", toneBar.info)}
                  style={{ width: `${(inProgressItems / totalItems) * 100}%` }}
                />
                <div
                  className={cn("h-full transition-all", toneBar.neutral)}
                  style={{ width: `${(todoItems / totalItems) * 100}%` }}
                />
              </>
            )}
          </div>
          {totalItems > 0 && (
            <div className="flex flex-wrap gap-3 text-2xs text-muted-foreground tabular-nums">
              <span className="flex items-center gap-1"><span className={cn("size-2 rounded-full", toneDot.success)} /> Done ({completedItems})</span>
              <span className="flex items-center gap-1"><span className={cn("size-2 rounded-full", toneDot.info)} /> In Progress ({inProgressItems})</span>
              <span className="flex items-center gap-1"><span className={cn("size-2 rounded-full", toneDot.neutral)} /> To Do ({todoItems})</span>
            </div>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4" id={epicCardId} role="region" aria-label={`Stories for ${epic.title}`}>
          <div className="space-y-2 border-l border-border pl-4 sm:ml-9">
            {stories.map((story) => (
              <div
                key={story.id}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <BookOpen className="size-4 shrink-0 text-info-strong" aria-hidden="true" />
                  <span className="truncate font-medium" title={story.title}>{story.title}</span>
                  {story.points != null && story.points > 0 && (
                    <Badge variant="secondary" className="tabular-nums">{story.points} pts</Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill tone={storyStatusTone(story.status)}>
                    {story.status || "TODO"}
                  </StatusPill>
                  <Link href={`/projects/${projectId}?ticket=${story.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              </div>
            ))}

            {stories.length === 0 && (
              <EmptyState
                compact
                title="No stories linked yet"
              />
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Input
                value={newStoryTitle}
                onChange={(e) => setNewStoryTitle(e.target.value)}
                placeholder="New story title..."
                aria-label={`Add new story to ${epic.title}`}
                className="h-8 min-w-40 flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newStoryTitle.trim()) {
                    onCreateStory(newStoryTitle.trim());
                    setNewStoryTitle("");
                  }
                }}
              />
              <Button
                size="sm"
                loading={isCreatingStory}
                onClick={() => {
                  if (newStoryTitle.trim()) {
                    onCreateStory(newStoryTitle.trim());
                    setNewStoryTitle("");
                  }
                }}
                disabled={!newStoryTitle.trim()}
              >
                <Plus className="size-3.5" />
                Add
              </Button>
              {unlinkedStories.length > 0 && (
                <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Link2 className="size-3.5" />
                      Link
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="end">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {unlinkedStories.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            onLinkStory(s.id);
                            setLinkOpen(false);
                          }}
                          className="w-full truncate rounded-sm p-2 text-left text-sm transition-colors hover:bg-muted focus-visible:focus-ring"
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
