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
import { IconChip } from "@/components/ui/icon-chip";
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
        size="lg"
        className="gap-0 overflow-hidden p-0"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <TicketHeader
          ticketId={ticketId}
          ticketNumber={ticket?.ticketNumber}
          priority={ticket?.priority || "MEDIUM"}
          status={ticket?.status || "TODO"}
          title={ticket?.title || ""}
          type={ticket?.type}
          isLoading={isLoading}
          saving={saving}
          isDeleting={deleteTicketMutation.isPending}
          onDelete={() =>
            deleteTicketMutation.mutate({ ticketId: ticketId! })
          }
          titleEditor={
            ticket ? (
              <Input
                value={localTitle}
                onChange={(e) => {
                  setLocalTitle(e.target.value);
                  debouncedSave({ title: e.target.value });
                }}
                className="-mx-2 h-auto border-transparent bg-transparent px-2 py-1 font-display text-xl font-semibold shadow-none hover:border-border focus-visible:border-input"
                placeholder="Ticket title"
              />
            ) : undefined
          }
        />

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-text mb-4" />
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          ) : ticketError?.message?.includes("don't have access") ||
            ticketError?.message?.includes("FORBIDDEN") ? (
            <div className="py-16 text-center">
              <IconChip icon={AlertCircle} tone="neutral" className="mx-auto mb-4 size-12" />
              <p className="font-medium text-foreground mb-1">Restricted Access</p>
              <p className="text-sm text-muted-foreground">
                You can only view details of tickets assigned to you.
              </p>
            </div>
          ) : ticket ? (
            <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_280px]">
              {/* Property rail: above content on narrow screens, right column from md. */}
              <aside className="space-y-6 border-b border-border bg-surface-sunken/50 p-4 md:order-last md:border-b-0 md:border-l">
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
              </aside>

              <div className="min-w-0 space-y-7 p-5">
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </h4>
                  <Textarea
                    value={localDescription}
                    onChange={(e) => {
                      setLocalDescription(e.target.value);
                      debouncedSave({ description: e.target.value });
                    }}
                    className="min-h-28 resize-y border-transparent bg-surface-sunken text-sm shadow-none hover:border-border focus-visible:border-input focus-visible:bg-background"
                    placeholder="Add a description..."
                  />
                </section>

                {ticket.attachments && ticket.attachments.length > 0 && (
                  <section className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Attachments
                    </h4>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ticket.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => viewFile(att.fileUrl)}
                          className="group relative aspect-video overflow-hidden rounded-md border border-border bg-muted text-left transition-colors hover:border-primary focus-visible:focus-ring"
                        >
                          {att.mimeType?.startsWith("image/") ? (
                            <AttachmentImage fileUrl={att.fileUrl} fileName={att.fileName} />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-2xs p-1 text-center">
                              {att.fileName}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-overlay opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-4 w-4 text-ink-50" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <TicketSubtasks
                  ticketId={ticketId!}
                  projectId={projectId}
                  subtasks={subtasks || []}
                />

                <TicketRelations
                  ticketId={ticketId!}
                  projectId={projectId}
                />

                <ActivityFeed
                  ticketId={ticketId!}
                  projectId={projectId}
                  comments={ticket.comments || []}
                />
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <IconChip icon={AlertCircle} tone="danger" className="mx-auto mb-4 size-12" />
              <p className="text-destructive font-medium">Ticket not found</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
