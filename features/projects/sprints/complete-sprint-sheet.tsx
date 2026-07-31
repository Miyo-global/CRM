"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { SprintData } from "./sprint-card";

interface CompleteSprintSheetProps {
  sprint: SprintData | null;
  nextPlannedSprint: SprintData | undefined;
  moveToOption: string;
  isUpdating: boolean;
  onMoveToChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CompleteSprintSheet({
  sprint,
  nextPlannedSprint,
  moveToOption,
  isUpdating,
  onMoveToChange,
  onCancel,
  onConfirm,
}: CompleteSprintSheetProps) {
  const incompleteCount = sprint
    ? (sprint.tickets || []).filter((t) => t.status !== "DONE").length
    : 0;

  const effectiveMoveTo =
    moveToOption === "next" && !nextPlannedSprint ? "backlog" : moveToOption;

  const handleConfirm = () => {
    if (effectiveMoveTo !== moveToOption) {
      onMoveToChange(effectiveMoveTo);
    }
    onConfirm();
  };

  return (
    <Sheet open={!!sprint} onOpenChange={(open) => !open && onCancel()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            Complete Sprint: {sprint?.name}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {incompleteCount > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {incompleteCount} ticket{incompleteCount > 1 ? "s are" : " is"} not done. Where should they go?
              </p>
              <Select value={effectiveMoveTo} onValueChange={onMoveToChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Move to Backlog</SelectItem>
                  {nextPlannedSprint && (
                    <SelectItem value="next">Move to {nextPlannedSprint.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">All tickets are done! Ready to complete this sprint.</p>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isUpdating}>
            {isUpdating ? "Completing..." : "Complete Sprint"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
