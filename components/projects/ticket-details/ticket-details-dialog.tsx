"use client";

import Image from "next/image";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { isExpenseAdmin } from "@/lib/auth/role-guards";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useProject,
  useSprints,
  useSubtasks,
} from "@/lib/hooks/trpc-hooks";
import { useEpics } from "@/lib/api/hooks/projects";
import { queryKeys } from "@/lib/query-keys";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useQueryClient } from "@tanstack/react-query";
import { getSignedFileUrl, viewFile } from "@/hooks/use-file-url";
import { TicketHeader } from "./ticket-header";
import { TicketSidebar } from "./ticket-sidebar";
import { TicketSubtasks } from "./ticket-subtasks";
import { TicketRelations } from "./ticket-relations";
import { TicketTimeTracker } from "./ticket-time-tracker";
import { WatcherList } from "./watcher-list";
import { ActivityFeed } from "./activity-feed";
import type { TicketDetailsDialogProps, ProjectMember } from "./types";

function AttachmentImage({
  fileUrl,
  fileName,
}: {
  fileUrl: string;
  fileName: string;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadImage = async () => {
      try {
        const signedUrl = await getSignedFileUrl(fileUrl);
        if (mounted) setImageSrc(signedUrl);
      } catch {
        if (mounted) setImageSrc(fileUrl);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadImage();
    return () => {
      mounted = false;
    };
  }, [fileUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={imageSrc || fileUrl}
      alt={fileName}
      fill
      unoptimized
      className="object-cover"
    />
  );
}

export function TicketDetailsDialog({
  ticketId,
  open,
  onOpenChange,
  projectId,
  statuses,
}: TicketDetailsDialogProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: ticket,
    isLoading,
    error: ticketError,
  } = useTicket(projectId, ticketId || 0);
  const { data: projectData } = useProject(projectId);
  const { data: sprints } = useSprints(projectId);
  const { data: subtasks } = useSubtasks(ticketId || 0, projectId);
  const { data: epicsList = [] } = useEpics(projectId);

  const epicOptions = useMemo(
    () =>
      epicsList.map((e) => ({
        id: e.id,
        title: (e.title && e.title.trim()) ? e.title : `Epic #${e.ticketNumber ?? e.id}`,
      })),
    [epicsList]
  );

  const members: ProjectMember[] = (() => {
    if (!projectData?.members) return [];
    const list = projectData.members
      .filter((m) => !!m.user)
      .map((m) => ({
        id: m.user!.id,
        name:
          m.user!.name ||
          `${m.user!.firstName || ""} ${m.user!.lastName || ""}`.trim(),
        firstName: m.user!.firstName || undefined,
        lastName: m.user!.lastName || undefined,
        image: m.user!.image || null,
        email: m.user!.email || "",
      }));
    const mgr =
      "manager" in projectData
        ? (
            projectData as {
              manager?: {
                id: string;
                name?: string | null;
                firstName?: string | null;
                lastName?: string | null;
                image?: string | null;
                email?: string | null;
              };
            }
          ).manager
        : undefined;
    if (mgr && !list.some((m) => m.id === mgr.id)) {
      list.unshift({
        id: mgr.id,
        name:
          mgr.name ||
          `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim(),
        firstName: mgr.firstName || undefined,
        lastName: mgr.lastName || undefined,
        image: mgr.image || null,
        email: mgr.email || "",
      });
    }
    return list;
  })();

  const canRemoveOtherWatchers = useMemo(() => {
    const uid = session?.user?.id;
    if (!ticket || !uid) return false;
    if (isExpenseAdmin(session?.user?.role)) return true;
    if (projectData?.managerId === uid) return true;
    if (ticket.reporterId === uid) return true;
    if (ticket.assigneeId === uid) return true;
    return (ticket.assignees ?? []).some((a) => a.userId === uid);
  }, [session?.user?.id, session?.user?.role, ticket, projectData?.managerId]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.detail(projectId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.ticket(ticketId!),
    });
  }, [queryClient, projectId, ticketId]);

  const updateTicketMutation = useUpdateTicket(projectId, {
    onSuccess: () => {
      setSaving(false);
      invalidateAll();
    },
    onError: (error) => {
      setSaving(false);
      toast.error(getErrorMessage(error));
    },
  });

  const deleteTicketMutation = useDeleteTicket(projectId, {
    onSuccess: () => {
      toast.success("Ticket deleted");
      invalidateAll();
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(getErrorMessage(error)),
  });

  const autoSave = useCallback(
    (field: Record<string, unknown>) => {
      if (!ticketId) return;
      setSaving(true);
      updateTicketMutation.mutate({ ticketId, ...field });
    },
    [ticketId, updateTicketMutation]
  );

  const debouncedSave = useCallback(
    (field: Record<string, unknown>) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setSaving(true);
      debounceTimerRef.current = setTimeout(() => {
        if (!ticketId) return;
        updateTicketMutation.mutate({ ticketId, ...field });
      }, 500);
    },
    [ticketId, updateTicketMutation]
  );

  useEffect(() => {
    if (ticket) {
      setLocalTitle(ticket.title);
      setLocalDescription(ticket.description || "");
    }
  }, [ticket]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[50vw] overflow-hidden p-0 flex flex-col"
      >

        <TicketHeader
          ticketId={ticketId}
          ticketNumber={ticket?.ticketNumber}
          priority={ticket?.priority || "MEDIUM"}
          status={ticket?.status || "TODO"}
          title={ticket?.title || ""}
          isLoading={isLoading}
          saving={saving}
          isDeleting={deleteTicketMutation.isPending}
          onDelete={() =>
            deleteTicketMutation.mutate({ ticketId: ticketId! })
          }
        />

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          ) : ticketError?.message?.includes("don't have access") ||
            ticketError?.message?.includes("FORBIDDEN") ? (
            <div className="py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">Restricted Access</p>
              <p className="text-sm text-muted-foreground">
                You can only view details of tickets assigned to you.
              </p>
            </div>
          ) : ticket ? (
            <>

              <div className="border-b">
                <TicketSidebar
                  ticket={ticket}
                  ticketId={ticketId!}
                  projectId={projectId}
                  members={members}
                  sprints={sprints || []}
                  epics={epicOptions}
                  statuses={statuses}
                  onAutoSave={autoSave}
                />
              </div>

              <div className="p-4 space-y-5">

                <Input
                  value={localTitle}
                  onChange={(e) => {
                    setLocalTitle(e.target.value);
                    debouncedSave({ title: e.target.value });
                  }}
                  className="text-base font-semibold border-0 bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                  placeholder="Ticket title"
                />

                <Textarea
                  value={localDescription}
                  onChange={(e) => {
                    setLocalDescription(e.target.value);
                    debouncedSave({ description: e.target.value });
                  }}
                  className="min-h-[80px] text-sm border-0 bg-muted/30 focus-visible:bg-background focus-visible:ring-1 resize-none rounded-lg"
                  placeholder="Add a description..."
                />

                <TicketSubtasks
                  ticketId={ticketId!}
                  projectId={projectId}
                  subtasks={subtasks || []}
                />

                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      Attachments
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {ticket.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => viewFile(att.fileUrl)}
                          className="group relative aspect-video rounded-md overflow-hidden bg-muted border hover:border-primary/50 transition-all text-left"
                        >
                          {att.mimeType?.startsWith("image/") ? (
                            <AttachmentImage fileUrl={att.fileUrl} fileName={att.fileName} />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] p-1 text-center">
                              {att.fileName}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <TicketRelations
                  ticketId={ticketId!}
                  projectId={projectId}
                />

                <TicketTimeTracker
                  ticketId={ticketId!}
                  projectId={projectId}
                  timeSpent={ticket.timeSpent ?? null}
                />

                <WatcherList
                  projectId={projectId}
                  ticketId={ticketId!}
                  members={members}
                  canRemoveOtherWatchers={canRemoveOtherWatchers}
                />

                <ActivityFeed
                  ticketId={ticketId!}
                  projectId={projectId}
                  comments={ticket.comments || []}
                />
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive font-medium">Ticket not found</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
