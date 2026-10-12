"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTicketDialog } from "./create-ticket-dialog";

export function QuickAddInput({ columnId, projectId }: { columnId: string; projectId: number }) {
  const [open, setOpen] = useState(false);
  const handleClick = useCallback(() => setOpen(true), []);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add ticket
      </Button>
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
