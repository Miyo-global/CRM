"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import {
  useKbPurgeImpact,
  usePurgeKbPages,
  useRestoreKbPages,
  type KbPurgeImpact,
} from "@/lib/api/hooks/knowledge";
import { pluralise } from "@/lib/format-utils";

/**
 * KB-0086: restore or purge what is selected.
 *
 * Purge asks the server what it is about to destroy before the confirmation,
 * because a purge cannot be undone and the count in the list is not the whole
 * story — a page takes its versions, comments and files with it.
 */
export function TrashBulkActions({
  selected,
  onDone,
  canPurge,
}: {
  selected: number[];
  onDone: () => void;
  canPurge: boolean;
}) {
  const [impact, setImpact] = useState<KbPurgeImpact | null>(null);
  const restorePages = useRestoreKbPages();
  const purgeImpact = useKbPurgeImpact();
  const purgePages = usePurgeKbPages();

  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2">
      <span className="text-sm text-muted-foreground">
        {pluralise(selected.length, "page")} selected
      </span>

      <Button
        size="sm"
        className="ml-auto"
        disabled={restorePages.isPending}
        onClick={() =>
          restorePages.mutate(selected, {
            onSuccess: () => {
              toast.success("Restored");
              onDone();
            },
            onError: () => toast.error("Couldn't restore those pages."),
          })
        }
      >
        Restore
      </Button>

      {canPurge ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={purgeImpact.isPending}
          onClick={() =>
            purgeImpact.mutate(selected, {
              onSuccess: setImpact,
              onError: () => toast.error("Couldn't work out what that would delete."),
            })
          }
        >
          Delete for good
        </Button>
      ) : null}

      <AlertDialog open={!!impact} onOpenChange={(open) => !open && setImpact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete for good?</AlertDialogTitle>
            <AlertDialogDescription>
              {impact
                ? `${pluralise(impact.pages, "page")} and ${pluralise(impact.attachments, "attachment")} will be removed. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {impact && impact.heldPages.length > 0 ? (
            <p className="text-sm text-warning-strong">
              {pluralise(impact.heldPages.length, "page")} on legal hold will be left alone.
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                purgePages.mutate(selected, {
                  onSuccess: (result) => {
                    toast.success(`Deleted ${result.purged.length} for good`);
                    setImpact(null);
                    onDone();
                  },
                  onError: () =>
                    toast.error("Nothing was deleted. Pages on legal hold cannot be purged."),
                })
              }
            >
              Delete for good
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
