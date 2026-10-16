"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TicketDetailBody } from "./ticket-detail-body";
import type { TicketDetailsDialogProps } from "./types";

export function TicketDetailsDialog({ ticketId, open, onOpenChange, projectId, statuses }: TicketDetailsDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="gap-0 overflow-hidden p-0 max-sm:w-full max-sm:max-w-full">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {ticketId ? (
            <TicketDetailBody
              projectId={projectId}
              ticketId={ticketId}
              statuses={statuses}
              variant="pane"
              onArchived={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
