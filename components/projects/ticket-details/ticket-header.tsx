"use client";

import { useState } from "react";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "../shared/status-badge";
import { TicketTypeIcon } from "../shared/ticket-type-icon";

interface TicketHeaderProps {
  ticketId: number | null;
  ticketNumber?: number | null;
  priority: string;
  status: string;
  title: string;
  isLoading: boolean;
  saving: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  /** Ticket type for the leading icon (TASK, BUG, …). */
  type?: string | null;
  /** Inline title editor; when given, the static title is kept for screen readers only. */
  titleEditor?: React.ReactNode;
}

export function TicketHeader({
  ticketId,
  ticketNumber,
  priority,
  status,
  title,
  isLoading,
  saving,
  isDeleting,
  onDelete,
  type,
  titleEditor,
}: TicketHeaderProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="sticky top-0 z-sticky shrink-0 border-b border-border bg-surface-raised">
      <SheetHeader className="gap-2 px-5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {type && (
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted">
                <TicketTypeIcon type={type} size="md" />
              </span>
            )}
            <span className="shrink-0 font-mono text-xs font-medium text-muted-foreground tabular-nums">
              #{ticketNumber ?? ticketId}
            </span>
            {!isLoading && (
              <>
                <StatusBadge status={status} />
                <PriorityBadge priority={priority} showLabel size="sm" />
                {saving && (
                  <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving
                  </span>
                )}
              </>
            )}
          </div>

          {!isLoading && ticketId && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Delete ticket"
              onClick={() => setDeleteOpen(true)}
              loading={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <SheetTitle
          className={cn(
            "font-display text-xl leading-snug font-semibold line-clamp-2",
            titleEditor && "sr-only"
          )}
        >
          {isLoading ? "Loading..." : title}
        </SheetTitle>
        {titleEditor}
      </SheetHeader>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Ticket"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}
