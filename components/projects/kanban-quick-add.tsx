"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { CreateTicketDialog } from "./create-ticket-dialog";

export function QuickAddInput({ columnId, projectId }: { columnId: string; projectId: number }) {
  const [open, setOpen] = useState(false);
  const handleClick = useCallback(() => setOpen(true), []);

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 w-full p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add ticket
      </button>
      <CreateTicketDialog
        projectId={projectId}
        open={open}
        onOpenChange={setOpen}
        defaultStatus={columnId}
        hideTrigger
      />
    </>
  );
}
