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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Bug,
  Wrench,
  Pencil,
  Trash2,
  Plus,
  Link2,
} from "lucide-react";
import { EmptyTasksIllustration } from "@/components/illustrations";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function EpicsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const { data: project, isLoading } = useProject(projectId);

  const updateTicket = useUpdateTicket(projectId);
  const deleteTicket = useDeleteTicket(projectId);
  const createTicket = useCreateTicket();

  if (isLoading) {
    return (
      <PageWrapper title="Epics">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-border/60">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{epics.length}</p>
                <p className="text-sm text-muted-foreground">Epics</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stories.length}</p>
                <p className="text-sm text-muted-foreground">Stories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-sm text-muted-foreground">Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {tickets.filter(t => t.status === "DONE").length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-6">
        {epics.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <EmptyState
              illustration={<EmptyTasksIllustration className="h-32 w-32 opacity-95" />}
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
            />
          ))
        )}
      </div>

      {stories.filter(s => !s.epicId).length > 0 && (
        <section className="mt-8 pt-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Stories without Epic
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {stories.filter(s => !s.epicId).map((story) => (
                  <div
                    key={story.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{story.title}</span>
                      <Badge variant="outline" className="text-xs">{story.status}</Badge>
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
}

function EpicCard({ epic, stories, projectId, unlinkedStories, onDeleteEpic, onLinkStory, onCreateStory, isDeleting }: EpicCardProps) {
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
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={epicCardId}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsExpanded(!isExpanded); } }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-0.5" aria-label={isExpanded ? "Collapse epic" : "Expand epic"}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-500" />
                {epic.title}
              </CardTitle>
              {epic.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{epic.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Badge variant="outline" className={getColorSafe(priorityColors, epic.priority || "MEDIUM")}>
              {epic.priority || "MEDIUM"}
            </Badge>
            <EditEpicDialog epic={epic} projectId={projectId} trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${epic.title}`}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            } />
            <Popover open={deleteConfirm} onOpenChange={setDeleteConfirm}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label={`Delete ${epic.title}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <p className="text-sm mb-3">Delete this epic? Child stories will be unlinked.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={onDeleteEpic} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="ml-9 mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedItems} of {totalItems} stories completed
            </span>
            <span className="text-muted-foreground">
              {completedPoints} / {totalPoints} points
            </span>
          </div>
          <div
            className="w-full h-2 bg-secondary rounded-full flex overflow-hidden"
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
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${(completedItems / totalItems) * 100}%` }}
                />
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${(inProgressItems / totalItems) * 100}%` }}
                />
                <div
                  className="bg-gray-300 dark:bg-gray-600 h-full transition-all"
                  style={{ width: `${(todoItems / totalItems) * 100}%` }}
                />
              </>
            )}
          </div>
          {totalItems > 0 && (
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Done ({completedItems})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full" /> In Progress ({inProgressItems})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" /> To Do ({todoItems})</span>
            </div>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4" id={epicCardId} role="region" aria-label={`Stories for ${epic.title}`}>
          <div className="ml-9 space-y-2 border-l-2 border-muted pl-4">
            {stories.map((story) => (
              <div
                key={story.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{story.title}</span>
                  {story.points != null && story.points > 0 && (
                    <Badge variant="secondary" className="text-xs">{story.points} pts</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", story.status === "DONE" && "border-green-500 text-green-500")}
                  >
                    {story.status || "TODO"}
                  </Badge>
                  <Link href={`/projects/${projectId}?ticket=${story.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              </div>
            ))}

            {stories.length === 0 && (
              <div className="p-4 flex flex-col items-center">
                <EmptyTasksIllustration className="mx-auto mb-4 h-36 w-36 opacity-95" />
                <p className="text-sm text-muted-foreground text-center">No stories linked yet</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Input
                value={newStoryTitle}
                onChange={(e) => setNewStoryTitle(e.target.value)}
                placeholder="New story title..."
                aria-label={`Add new story to ${epic.title}`}
                className="h-8 text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newStoryTitle.trim()) {
                    onCreateStory(newStoryTitle.trim());
                    setNewStoryTitle("");
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8"
                onClick={() => {
                  if (newStoryTitle.trim()) {
                    onCreateStory(newStoryTitle.trim());
                    setNewStoryTitle("");
                  }
                }}
                disabled={!newStoryTitle.trim()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
              {unlinkedStories.length > 0 && (
                <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Link2 className="h-3.5 w-3.5 mr-1" />
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
                          className="w-full text-left p-2 text-sm rounded hover:bg-muted transition-colors truncate"
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
