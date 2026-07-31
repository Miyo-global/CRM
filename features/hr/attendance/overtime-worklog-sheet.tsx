"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHrLogOvertime } from "@/lib/api/hooks/hr";
import { toast } from "sonner";

interface OvertimeWorklogSheetProps {
  open: boolean;
  date: string | null;
  totalWorkHours?: number;
  onClose: () => void;
}

export function OvertimeWorklogSheet({ open, date, totalWorkHours, onClose }: OvertimeWorklogSheetProps) {
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const logOvertime = useHrLogOvertime({
    onSuccess: () => {
      toast.success("Overtime worklog saved");
      reset();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  function reset() {
    setNote("");
    setProofUrl("");
  }

  function handleSave() {
    if (!note.trim()) {
      toast.error("Please describe the overtime work.");
      return;
    }
    logOvertime.mutate({
      localDate: date ?? undefined,
      note: note.trim(),
      proofUrl: proofUrl.trim() || undefined,
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next && !logOvertime.isPending) {
      reset();
      onClose();
    }
  }

  const hoursLabel =
    typeof totalWorkHours === "number" ? `${totalWorkHours.toFixed(2)}h` : "over 9h";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex h-full flex-col gap-0 p-0 sm:max-w-md w-full">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle>Log your overtime</SheetTitle>
          <SheetDescription>
            You worked {hoursLabel} today. Since that&apos;s over 9 hours, add a quick worklog as a
            record of what you did. This is optional — you can skip it.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ot-note">What did you work on?</Label>
            <Textarea
              id="ot-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Briefly describe the overtime work…"
              rows={5}
              maxLength={5000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ot-proof">Proof link (optional)</Label>
            <Input
              id="ot-proof"
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://… (PR, doc, ticket)"
            />
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={logOvertime.isPending}
          >
            Skip
          </Button>
          <Button onClick={handleSave} disabled={logOvertime.isPending || !note.trim()}>
            {logOvertime.isPending ? "Saving…" : "Save worklog"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
