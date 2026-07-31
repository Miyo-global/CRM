"use client";

import { memo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface StageSkipDialogProps {
  dialog: { id: number; from: string; to: string; skipped: string[] } | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const StageSkipDialog = memo(function StageSkipDialog({
  dialog,
  isPending,
  onOpenChange,
  onCancel,
  onConfirm,
}: StageSkipDialogProps) {
  return (
    <Sheet open={dialog !== null} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Skip stages?</SheetTitle>
          <SheetDescription>
            You are moving this deal from <strong>{dialog?.from}</strong> to{" "}
            <strong>{dialog?.to}</strong>, skipping:{" "}
            <strong>{dialog?.skipped.join(", ")}</strong>.
            Are you sure you want to skip these stages?
          </SheetDescription>
        </SheetHeader>
        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gold hover:bg-gold/90 text-white"
            disabled={isPending}
            onClick={onConfirm}
          >
            Confirm Skip
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
