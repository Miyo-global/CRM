"use client";

import { useState } from "react";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, Loader2 } from "lucide-react";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "../shared/status-badge";

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
}: TicketHeaderProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="shrink-0 border-b px-4 py-3">
      <SheetHeader className="space-y-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Badge variant="outline" className="font-mono text-[11px] shrink-0 h-5 px-1.5">
              #{ticketNumber ?? ticketId}
            </Badge>
            {!isLoading && (
              <>
                <StatusBadge status={status} />
                <PriorityBadge priority={priority} showLabel size="sm" />
                {saving && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 mr-8">
          {!isLoading && ticketId && (
            <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Delete ticket"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <p className="text-sm font-medium text-destructive mb-1">Delete Ticket</p>
                <p className="text-xs text-muted-foreground mb-3">
                  This cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDeleteOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onDelete} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          </div>
        </div>

        <SheetTitle className="text-base font-semibold leading-snug mt-1.5 line-clamp-2">
          {isLoading ? "Loading..." : title}
        </SheetTitle>
      </SheetHeader>
    </div>
  );
}
