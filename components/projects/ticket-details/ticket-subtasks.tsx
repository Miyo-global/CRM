"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListChecks, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import {
  useCreateTicket,
  useUpdateTicket,
  useDeleteTicket,
} from "@/lib/hooks/trpc-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface Subtask {
  id: number;
  title?: string | null;
  status?: string | null;
  assignee?: {
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  } | null;
}

interface TicketSubtasksProps {
  ticketId: number;
  projectId: number;
  subtasks: Subtask[];
}

export function TicketSubtasks({
  ticketId,
  projectId,
  subtasks,
}: TicketSubtasksProps) {
  const queryClient = useQueryClient();
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Subtask | null>(null);

  const subtasksDone = subtasks.filter((s) => s.status === "DONE").length;
  const subtasksTotal = subtasks.length;
  const subtaskProgress =
    subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0;

  const subtaskQueryKey = [
    ...queryKeys.projects.all,
    "subtasks",
    { ticketId },
  ];

  const invalidateSubtasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: subtaskQueryKey });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.detail(projectId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.ticket(ticketId),
    });
  }, [queryClient, subtaskQueryKey, projectId, ticketId]);

  const createSubtask = useCreateTicket({
    onSuccess: () => {
      setSubtaskTitle("");
      invalidateSubtasks();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateTicketMutation = useUpdateTicket(projectId, {
    onSuccess: () => {
      setTimeout(() => {
        invalidateSubtasks();
      }, 300);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteTicketMutation = useDeleteTicket(projectId, {
    onSuccess: () => {
      invalidateSubtasks();
      setDeleteTarget(null);
      toast.success("Subtask removed");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      setDeleteTarget(null);
    },
  });

  const handleAddSubtask = () => {
    if (!subtaskTitle.trim()) return;
    createSubtask.mutate({
      projectId,
      title: subtaskTitle.trim(),
      type: "TASK",
      parentTicketId: ticketId,
    });
  };

  const handleToggleSubtask = (
    subtaskId: number,
    currentStatus: string | null | undefined
  ) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    updateTicketMutation.mutate({ ticketId: subtaskId, status: newStatus });
  };

  const startEdit = (sub: Subtask) => {
    setEditingId(sub.id);
    setEditTitle(sub.title?.trim() ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const saveEdit = (subtaskId: number) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      toast.error("Subtask title cannot be empty");
      return;
    }
    updateTicketMutation.mutate(
      { ticketId: subtaskId, title: trimmed },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditTitle("");
        },
      }
    );
  };

  const requestDelete = (sub: Subtask) => {
    if (sub.status === "DONE") {
      toast.error("Mark the subtask as not done before deleting.");
      return;
    }
    setDeleteTarget(sub);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTicketMutation.mutate({ ticketId: deleteTarget.id });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Subtasks</h4>
          {subtasksTotal > 0 && (
            <Badge variant="secondary" className="text-xs">
              {subtasksDone}/{subtasksTotal}
            </Badge>
          )}
        </div>

        {subtasksTotal > 0 && (
          <Progress value={subtaskProgress} className="h-1.5 mb-3" />
        )}

        <div className="space-y-1.5 mb-3">
          {subtasks.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <Checkbox
                checked={sub.status === "DONE"}
                onCheckedChange={() => handleToggleSubtask(sub.id, sub.status)}
                disabled={editingId === sub.id}
              />
              {editingId === sub.id ? (
                <div className="flex flex-1 items-center gap-1 min-w-0">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-8 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(sub.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Save subtask title"
                    onClick={() => saveEdit(sub.id)}
                    disabled={updateTicketMutation.isPending}
                  >
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Cancel edit"
                    onClick={cancelEdit}
                    disabled={updateTicketMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span
                    className={`text-sm flex-1 min-w-0 truncate ${
                      sub.status === "DONE"
                        ? "line-through text-muted-foreground"
                        : ""
                    }`}
                  >
                    {sub.title}
                  </span>
                  {sub.assignee && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={resolveImageUrl(sub.assignee.image)} />
                      <AvatarFallback className="text-[10px]">
                        {sub.assignee.firstName?.[0]}
                        {sub.assignee.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Edit subtask"
                      onClick={() => startEdit(sub)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {sub.status === "DONE" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              aria-label="Cannot delete completed subtask"
                              disabled
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[220px]">
                          Mark the subtask as not done before deleting.
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label="Delete subtask"
                        onClick={() => requestDelete(sub)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            placeholder="Add subtask..."
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubtask();
            }}
          />
          <Button
            size="sm"
            className="h-8"
            onClick={handleAddSubtask}
            disabled={!subtaskTitle.trim() || createSubtask.isPending}
            aria-label="Add subtask"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subtask?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.title ?? "this subtask"}
              </span>
              . This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTicketMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteTicketMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
