"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** MIYO-0632: send a saved draft to its approver. */
export function SubmitDraftButton({ requisitionId }: { requisitionId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/ats/requisitions/${requisitionId}/submit`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? "Could not submit the requisition.");
        return;
      }
      toast.success(
        body.emailSent ? "Sent to the approver." : "Submitted. The approval email did not go out.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button disabled={busy} onClick={() => void submit()}>
      Submit for approval
    </Button>
  );
}
