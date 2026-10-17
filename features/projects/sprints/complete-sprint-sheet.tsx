"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
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
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-border pl-6">
          <SheetTitle className="flex items-center gap-2">
            <IconChip icon={AlertTriangle} tone="warning" size="sm" />
            <span className="min-w-0 truncate">Complete Sprint: {sprint?.name}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {incompleteCount > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">{incompleteCount}</span> ticket{incompleteCount > 1 ? "s are" : " is"} not done. Where should they go?
              </p>
              <Select value={effectiveMoveTo} onValueChange={onMoveToChange}>
                <SelectTrigger className="w-full">
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
        <SheetFooter className="sticky bottom-0 bg-surface-raised">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm} loading={isUpdating}>
            {isUpdating ? "Completing..." : "Complete Sprint"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
