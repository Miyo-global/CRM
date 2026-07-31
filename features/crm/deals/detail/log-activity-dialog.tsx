"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LogActivityDialogProps {
  open: boolean;
  actionLabel: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => void;
}

export function LogActivityDialog({
  open,
  actionLabel,
  isPending,
  onClose,
  onSubmit,
}: LogActivityDialogProps) {
  const [notes, setNotes] = useState("");

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    onSubmit(notes.trim());
    setNotes("");
  }, [notes, onSubmit]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) {
      onClose();
      setNotes("");
    }
  }, [onClose]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{actionLabel}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-notes">Details</Label>
            <Textarea
              id="activity-notes"
              value={notes}
              onChange={handleNotesChange}
              placeholder={`Enter ${actionLabel.toLowerCase()} details...`}
              rows={4}
              required
            />
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              className="bg-gold hover:bg-gold/90 text-white"
              disabled={isPending || !notes.trim()}
            >
              {isPending ? "Logging..." : "Log Activity"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
