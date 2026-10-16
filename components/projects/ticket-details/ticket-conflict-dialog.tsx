"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TicketConflictDialogProps {
  open: boolean;
  onLoadLatest: () => void;
  onKeepMine: () => void;
}

export function TicketConflictDialog({ open, onLoadLatest, onKeepMine }: TicketConflictDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Someone else changed this ticket</AlertDialogTitle>
          <AlertDialogDescription>
            Your last change was not saved because the ticket was updated while you were editing. Load the latest
            version to see their changes, or keep your text and save it over theirs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onKeepMine}>Keep my version</AlertDialogCancel>
          <AlertDialogAction onClick={onLoadLatest}>Load latest</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
