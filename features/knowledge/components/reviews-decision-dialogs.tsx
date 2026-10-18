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
import { useDecideKbReview } from "@/lib/api/hooks/knowledge";

/**
 * KB-0087: approve or reject one review.
 *
 * A rejection needs a note — the server requires one — because "no" without a
 * reason sends the writer back to the page with nothing to act on. An approval
 * may carry one.
 */
export function ReviewDecisionDialog({
  review,
  decision,
  onOpenChange,
}: {
  review: { id: number; pageTitle?: string | null } | null;
  decision: "approve" | "reject";
  onOpenChange: (open: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const decide = useDecideKbReview();

  const rejecting = decision === "reject";

  return (
    <Dialog open={!!review} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {rejecting ? "Reject" : "Approve"} “{review?.pageTitle ?? "this page"}”
          </DialogTitle>
          <DialogDescription>
            {rejecting
              ? "Say what needs changing. The writer sees this note."
              : "Add a note if it helps. Optional."}
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
            disabled={decide.isPending || (rejecting && note.trim().length === 0)}
            onClick={() => {
              if (!review) return;
              decide.mutate(
                { reviewId: review.id, decision, note: note.trim() || undefined },
                {
                  onSuccess: () => {
                    toast.success(rejecting ? "Rejected" : "Approved");
                    setNote("");
                    onOpenChange(false);
                  },
                  onError: () => toast.error("Couldn't record that decision."),
                },
              );
            }}
          >
            {rejecting ? "Reject" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
