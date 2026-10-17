"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/** MIYO-0632: approve or reject, with the comment kept either way. */
export function RequisitionDecision({ requisitionId }: { requisitionId: number }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    try {
      const res = await fetch(`/api/ats/requisitions/${requisitionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment: comment.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? "Could not record the decision.");
        return;
      }
      toast.success(decision === "APPROVED" ? "Approved." : "Rejected.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-xl gap-3">
      <Label htmlFor="comment">Comment</Label>
      <Textarea
        id="comment"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional, but a rejection is easier to act on with one."
      />
      <div className="flex gap-3">
        <Button disabled={busy} onClick={() => void decide("APPROVED")}>
          Approve
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void decide("REJECTED")}>
          Reject
        </Button>
      </div>
    </div>
  );
}
