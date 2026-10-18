"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pageHref } from "@/lib/knowledge/routes";

import type { BulkDecideResult } from "./reviews-bulk-decide-dialog";

/**
 * KB-0087: what the batch actually did.
 *
 * Rows that were already decided are listed rather than counted, so the person
 * can see which ones someone else got to first.
 */
export function ReviewsBulkResultsDialog({
  results,
  onOpenChange,
}: {
  results: BulkDecideResult[] | null;
  onOpenChange: (open: boolean) => void;
}) {
  const decided = (results ?? []).filter((row) => row.status !== "not_open");
  const skipped = (results ?? []).filter((row) => row.status === "not_open");

  return (
    <Dialog open={!!results} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Decisions recorded</DialogTitle>
          <DialogDescription>
            {decided.length} recorded
            {skipped.length > 0 ? `, ${skipped.length} already decided` : ""}.
          </DialogDescription>
        </DialogHeader>

        {skipped.length > 0 ? (
          <ul className="max-h-48 overflow-y-auto text-sm text-muted-foreground">
            {skipped.map((row) => (
              <li key={row.id} className="py-0.5">
                {row.pageId ? (
                  <Link href={pageHref(row.pageId)} className="underline underline-offset-4">
                    Review {row.id}
                  </Link>
                ) : (
                  `Review ${row.id}`
                )}{" "}
                was already decided
              </li>
            ))}
          </ul>
        ) : null}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
