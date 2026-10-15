"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { isExpenseAdmin } from "@/lib/auth/role-guards";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useRestoreTicket,
  useProject,
  useSprints,
  useSubtasks,
} from "@/lib/hooks/trpc-hooks";
import { useEpics } from "@/lib/api/hooks/projects";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useOrgFeatureFlags } from "@/lib/api/hooks/ai";
import { Textarea } from "@/components/ui/textarea";
import { IconChip } from "@/components/ui/icon-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { isTicketConflict } from "@/lib/projects/is-ticket-conflict";
import { TicketHeader } from "./ticket-header";
import { TicketSidebar } from "./ticket-sidebar";
import { TicketSubtasks } from "./ticket-subtasks";
import { TicketRelations } from "./ticket-relations";
import { TicketTimeTracker } from "./ticket-time-tracker";
import { WatcherList } from "./watcher-list";
import { ActivityFeed } from "./activity-feed";
import { TicketAttachments } from "./ticket-attachments";
import { TicketConflictDialog } from "./ticket-conflict-dialog";
import { TicketHistory } from "./ticket-history";
import { useTicketMembers } from "./use-ticket-members";

type Fields = Record<string, unknown>;

interface TicketDetailBodyProps {
  projectId: number;
  ticketId: number;
  statuses?: Array<{ name: string; id: number }>;
  variant: "pane" | "page";
  onArchived?: () => void;
}

function BodySkeleton() {
  return (
    <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_280px]" aria-busy="true">
      <div className="space-y-4 border-b border-border p-4 md:order-last md:border-b-0 md:border-l">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
      <div className="space-y-4 p-5">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export function TicketDetailBody({ projectId, ticketId, statuses, variant, onArchived }: TicketDetailBodyProps) {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [conflictFields, setConflictFields] = useState<Fields | null>(null);
  const pendingRef = useRef<Fields>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: ticket, isLoading, error: ticketError, refetch } = useTicket(projectId, ticketId);
  const { data: projectData } = useProject(projectId);
  const { data: sprints } = useSprints(projectId);
  const { data: subtasks } = useSubtasks(ticketId, projectId);
  const { data: epicsList = [] } = useEpics(projectId);
  const members = useTicketMembers(projectData);
  const canEdit = projectData?.viewerRole !== "VIEWER";
  const portalOn = !!useOrgFeatureFlags().data?.clientPortal;

  const epicOptions = useMemo(
    () => epicsList.map((e) => ({ id: e.id, title: e.title?.trim() ? e.title : `Epic #${e.ticketNumber ?? e.id}` })),
    [epicsList],
  );

  const canRemoveOtherWatchers = useMemo(() => {
    const uid = session?.user?.id;
    if (!ticket || !uid) return false;
    if (isExpenseAdmin(session?.user?.role)) return true;
    if (projectData?.managerId === uid || ticket.reporterId === uid || ticket.assigneeId === uid) return true;
    return (ticket.assignees ?? []).some((a) => a.userId === uid);
  }, [session?.user?.id, session?.user?.role, ticket, projectData?.managerId]);

  const updateTicket = useUpdateTicket(projectId);
  const restoreTicket = useRestoreTicket(projectId);
  const archiveTicket = useDeleteTicket(projectId, {
    onSuccess: () => {
      toast.success("Archived the ticket", {
        action: { label: "Undo", onClick: () => restoreTicket.mutate({ ticketId }) },
      });
      onArchived?.();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const send = useCallback(
    (fields: Fields, version?: number) => {
      if (!ticket) return;
      setSaving(true);
      updateTicket.mutate(
        { ticketId, ...fields, version: version ?? ticket.version },
        {
          onSettled: () => setSaving(false),
          onError: (error) => {
            if (isTicketConflict(error)) setConflictFields(fields);
            else toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [ticket, ticketId, updateTicket],
  );

  const flush = useCallback(() => {
    if (updateTicket.isPending) {
      timerRef.current = setTimeout(flush, 300);
      return;
    }
    const fields = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(fields).length > 0) send(fields);
  }, [send, updateTicket.isPending]);

  const debouncedSave = useCallback(
    (fields: Fields) => {
      pendingRef.current = { ...pendingRef.current, ...fields };
      if (timerRef.current) clearTimeout(timerRef.current);
      setSaving(true);
      timerRef.current = setTimeout(flush, 500);
    },
    [flush],
  );

  useEffect(() => {
    if (ticket && Object.keys(pendingRef.current).length === 0 && !conflictFields) {
      setLocalTitle(ticket.title);
      setLocalDescription(ticket.description || "");
    }
  }, [ticket, conflictFields]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const loadLatest = async () => {
    setConflictFields(null);
    pendingRef.current = {};
    const fresh = await refetch();
    if (fresh.data) {
      setLocalTitle(fresh.data.title);
      setLocalDescription(fresh.data.description || "");
    }
  };

  const keepMine = async () => {
    const fields = conflictFields;
    setConflictFields(null);
    const fresh = await refetch();
    if (fields && fresh.data) send(fields, fresh.data.version);
  };

  const ticketKey = ticket?.project?.key && ticket.ticketNumber ? `${ticket.project.key}-${ticket.ticketNumber}` : null;
  const notFound = !isLoading && !ticket;

  return (
    <>
      <TicketHeader
        variant={variant}
        ticketId={ticketId}
        ticketKey={ticketKey}
        priority={ticket?.priority || "MEDIUM"}
        status={ticket?.status || "TODO"}
        title={ticket?.title || (notFound ? "Ticket not found" : "")}
        type={ticket?.type}
        isLoading={isLoading}
        saving={saving}
        isDeleting={archiveTicket.isPending}
        onDelete={canEdit && ticket ? () => archiveTicket.mutate({ ticketId }) : undefined}
        fullPageHref={variant === "pane" && ticketKey ? `/projects/${projectId}/tickets/${ticketKey}` : undefined}
        titleEditor={
          ticket && canEdit ? (
            <Input
              value={localTitle}
              onChange={(e) => {
                setLocalTitle(e.target.value);
                if (e.target.value.trim()) debouncedSave({ title: e.target.value });
              }}
              aria-label="Ticket title"
              className="-mx-2 h-auto border-transparent bg-transparent px-2 py-1 font-display text-xl font-semibold shadow-none hover:border-border focus-visible:border-input"
              placeholder="Ticket title"
            />
          ) : undefined
        }
      />

      {isLoading ? (
        <BodySkeleton />
      ) : ticket ? (
        <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_280px]">
          <aside className="space-y-6 border-b border-border bg-surface-sunken/50 p-4 md:order-last md:border-b-0 md:border-l">
            <fieldset disabled={!canEdit} className="space-y-6">
              <TicketSidebar
                ticket={ticket}
                ticketId={ticketId}
                projectId={projectId}
                members={members}
                sprints={sprints || []}
                epics={epicOptions}
                statuses={statuses}
                onAutoSave={(fields) => send(fields)}
                readOnly={!canEdit}
              />
              <TicketTimeTracker ticketId={ticketId} projectId={projectId} timeSpent={ticket.timeSpent ?? null} readOnly={!canEdit} />
              {portalOn && (
                <label className="flex min-h-10 items-center justify-between gap-2 text-sm">
                  Visible to client
                  <Switch checked={!!ticket.clientVisible} onCheckedChange={(on) => send({ clientVisible: on })} />
                </label>
              )}
            </fieldset>
            <WatcherList
              projectId={projectId}
              ticketId={ticketId}
              members={members}
              canRemoveOtherWatchers={canRemoveOtherWatchers}
              readOnly={!canEdit}
            />
          </aside>

          <div className="min-w-0 space-y-7 p-5">
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h2>
              {canEdit ? (
                <Textarea
                  value={localDescription}
                  onChange={(e) => {
                    setLocalDescription(e.target.value);
                    debouncedSave({ description: e.target.value });
                  }}
                  aria-label="Description"
                  className="min-h-28 resize-y border-transparent bg-surface-sunken text-sm shadow-none hover:border-border focus-visible:border-input focus-visible:bg-background"
                  placeholder="Add a description..."
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.description || "No description"}</p>
              )}
            </section>

            <TicketAttachments attachments={ticket.attachments ?? []} />
            <TicketSubtasks ticketId={ticketId} projectId={projectId} subtasks={subtasks || []} readOnly={!canEdit} />
            <TicketRelations ticketId={ticketId} projectId={projectId} readOnly={!canEdit} />
            <ActivityFeed
              ticketId={ticketId}
              projectId={projectId}
              comments={ticket.comments || []}
              people={members.map((m) => ({ id: m.id, name: m.name || m.email, email: m.email }))}
              canComment={canEdit}
            />
            <TicketHistory projectId={projectId} ticketId={ticketId} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
          <IconChip icon={AlertCircle} tone="neutral" className="size-12" />
          <p className="font-medium text-foreground">This ticket doesn&apos;t exist, or you don&apos;t have access</p>
          <p className="text-sm text-muted-foreground">{ticketError ? getErrorMessage(ticketError) : "It may have been archived."}</p>
        </div>
      )}

      <TicketConflictDialog open={!!conflictFields} onLoadLatest={loadLatest} onKeepMine={keepMine} />
    </>
  );
}
