"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

interface DeclareWinnerDialogProps {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (variant: "A" | "B") => void;
}

export const DeclareWinnerDialog = memo(function DeclareWinnerDialog({
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: DeclareWinnerDialogProps) {
  const handleConfirmA = useCallback(() => onConfirm("A"), [onConfirm]);
  const handleConfirmB = useCallback(() => onConfirm("B"), [onConfirm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Declare Winner</DialogTitle>
          <DialogDescription>
            Which variant performed better? This will mark the test as completed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 pt-2">
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleConfirmA}
            disabled={isPending}
          >
            {isPending ? (
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <TrophyIcon className="h-4 w-4 mr-1.5" />
                A Wins
              </>
            )}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={handleConfirmB}
            disabled={isPending}
          >
            {isPending ? (
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <TrophyIcon className="h-4 w-4 mr-1.5" />
                B Wins
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
