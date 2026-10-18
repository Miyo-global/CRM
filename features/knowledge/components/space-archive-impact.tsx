"use client";

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
import { useArchiveKbSpace, useKbSpaceArchiveImpact } from "@/lib/api/hooks/knowledge";
import { pluralise } from "@/lib/format-utils";

/**
 * KB-0084: what archiving a space costs, before it happens.
 *
 * Share links are called out on their own line because archiving revokes them:
 * a link that outlives the decision to retire its space is exactly the leak
 * archiving is meant to close, and anyone holding one loses access.
 */
export function SpaceArchiveImpactDialog({
  spaceId,
  spaceName,
  open,
  onOpenChange,
}: {
  spaceId: number;
  spaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useKbSpaceArchiveImpact(open ? spaceId : undefined);
  const archiveSpace = useArchiveKbSpace(spaceId);
  const impact = data?.impact;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive “{spaceName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {isLoading || !impact
              ? "Counting what this affects…"
              : `${pluralise(impact.pages, "page")} will be hidden from the wiki, ${impact.published} of them published.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {impact ? (
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            <li>{pluralise(impact.pages, "page")} hidden</li>
            {impact.publicLinks > 0 ? (
              <li className="text-warning-strong">
                {pluralise(impact.publicLinks, "share link")} revoked — anyone holding one loses
                access
              </li>
            ) : null}
            {impact.linkedDocuments > 0 ? (
              <li>{pluralise(impact.linkedDocuments, "linked document")} unlinked</li>
            ) : null}
            <li>Pages can be reached again by restoring the space.</li>
          </ul>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              archiveSpace.mutate(true, {
                onSuccess: () => {
                  toast.success(`Archived ${spaceName}`);
                  onOpenChange(false);
                },
                onError: () => toast.error("Couldn't archive the space."),
              })
            }
          >
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
