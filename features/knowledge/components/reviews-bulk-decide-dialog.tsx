"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useBulkDecideKbReviews } from "@/lib/api/hooks/knowledge";
import { pluralise } from "@/lib/format-utils";

export interface BulkDecideResult {
  id: number;
  status: string;
  pageId?: number;
}

/**
 * KB-0087: decide a batch.
 *
 * The server answers per row rather than all-or-nothing, so one review that
 * someone else already decided does not throw away the other forty-nine.
 */
export function ReviewsBulkDecideDialog({
  ids,
  decision,
  open,
  onOpenChange,
  onResults,
}: {
  ids: number[];
  decision: "approve" | "reject";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResults: (results: BulkDecideResult[]) => void;
}) {
  const [note, setNote] = useState("");
  const bulkDecide = useBulkDecideKbReviews();

  const rejecting = decision === "reject";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {rejecting ? "Reject" : "Approve"} {pluralise(ids.length, "review")}?
          </DialogTitle>
          <DialogDescription>
            {rejecting
              ? "The same note goes on every rejection."
              : "At most fifty at a time."}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={rejecting ? "What needs to change?" : "Anything to add?"}
        />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              bulkDecide.isPending ||
              ids.length === 0 ||
              (rejecting && note.trim().length === 0)
            }
            onClick={() =>
              bulkDecide.mutate(
                { ids, decision, note: note.trim() || undefined },
                {
                  onSuccess: (data) => {
                    onResults(data.results);
                    setNote("");
                    onOpenChange(false);
                  },
                  onError: () => toast.error("Couldn't record those decisions."),
                },
              )
            }
          >
            {rejecting ? "Reject all" : "Approve all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
