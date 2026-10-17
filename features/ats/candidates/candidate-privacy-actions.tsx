"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * MIYO-0679, MIYO-0680: export what we hold on someone, or erase it when
 * they ask. Erasure keeps the application rows, so the funnel numbers do
 * not move; nothing in them points at a person afterwards.
 */
export function CandidatePrivacyActions({
  candidateId,
  canErase,
}: {
  candidateId: number;
  canErase: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function erase() {
    setBusy(true);
    try {
      const res = await fetch(`/api/ats/candidates/${candidateId}/erase`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Could not erase this candidate.");
        return;
      }
      toast.success("Erased. The applications stay, without their details.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-3">
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/ats/candidates/${candidateId}/export`}>Export data</a>
      </Button>

      {canErase && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy}>
              Erase
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Erase this candidate?</AlertDialogTitle>
              <AlertDialogDescription>
                Their name, contact details, resume and notes are removed and the resume file
                is deleted. The applications stay so the reports keep adding up. This cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction onClick={() => void erase()}>Erase</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
