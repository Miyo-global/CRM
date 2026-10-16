"use client";

import { useState } from "react";
import Link from "next/link";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Archive, Loader2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "../shared/status-badge";
import { TicketTypeIcon } from "../shared/ticket-type-icon";

interface TicketHeaderProps {
  ticketId: number | null;
  ticketKey: string | null;
  priority: string;
  status: string;
  title: string;
  isLoading: boolean;
  saving: boolean;
  isDeleting: boolean;
  onDelete?: () => void;
  type?: string | null;
  titleEditor?: React.ReactNode;
  fullPageHref?: string;
  variant: "pane" | "page";
}

export function TicketHeader({
  ticketId,
  ticketKey,
  priority,
  status,
  title,
  isLoading,
  saving,
  isDeleting,
  onDelete,
  type,
  titleEditor,
  fullPageHref,
  variant,
}: TicketHeaderProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const Wrapper = variant === "pane" ? SheetHeader : "div";
  const titleClass = cn("font-display text-xl leading-snug font-semibold line-clamp-2", titleEditor && "sr-only");

  return (
    <div className="sticky top-0 z-sticky shrink-0 border-b border-border bg-surface-raised">
      {/* Right padding leaves room for the sheet's close button (QA-0055). */}
      <Wrapper className="flex flex-col gap-2 px-5 pt-4 pr-14 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {type && (
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted">
                <TicketTypeIcon type={type} size="md" />
              </span>
            )}
            <span className="shrink-0 font-mono text-xs font-medium text-muted-foreground tabular-nums">
              {ticketKey ?? (ticketId ? `#${ticketId}` : "")}
            </span>
            {!isLoading && (
              <>
                <StatusBadge status={status} />
                <PriorityBadge priority={priority} showLabel size="sm" />
                {saving && (
                  <span className="flex items-center gap-1 text-2xs text-muted-foreground" role="status">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    Saving
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {fullPageHref && (
              <Button variant="ghost" size="icon" className="size-10 text-muted-foreground" asChild>
                <Link href={fullPageHref} aria-label="Open full page">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            )}
            {!isLoading && ticketId && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="size-10 text-muted-foreground hover:text-destructive"
                aria-label="Archive ticket"
                onClick={() => setDeleteOpen(true)}
                loading={isDeleting}
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {variant === "pane" ? (
          <SheetTitle className={titleClass}>{isLoading ? "Loading..." : title}</SheetTitle>
        ) : (
          <h1 className={titleClass}>{isLoading ? "Loading..." : title}</h1>
        )}
        {titleEditor}
      </Wrapper>

      {onDelete && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Archive this ticket?"
          description="It leaves the board and lists. You can undo right after, and project managers can restore it later."
          confirmLabel="Archive"
          destructive
          onConfirm={onDelete}
        />
      )}
    </div>
  );
}
