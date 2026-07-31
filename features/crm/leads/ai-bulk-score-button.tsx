"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { useAIBatchScoreLeads } from "@/lib/api/hooks/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface AIBulkScoreButtonProps {
  leadIds: number[];
  onComplete?: () => void;
}

export function AIBulkScoreButton({ leadIds, onComplete }: AIBulkScoreButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const batchMutation = useAIBatchScoreLeads();

  const handleScore = () => {
    batchMutation.mutate(leadIds, {
      onSuccess: (data) => {
        toast.success(`Scored ${data.scored} leads`);
        setConfirmOpen(false);
        onComplete?.();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  if (leadIds.length === 0) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setConfirmOpen(true)}
        disabled={batchMutation.isPending}
      >
        {batchMutation.isPending ? (
          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Scoring...</>
        ) : (
          <><Sparkles className="h-3.5 w-3.5 mr-1.5 text-gold" />AI Score {leadIds.length}</>
        )}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Score {leadIds.length} Lead{leadIds.length === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will use AI to score the selected leads from 0-100 with reasoning. Each lead&apos;s score will be updated in the database. Max 50 leads per batch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleScore} disabled={batchMutation.isPending}>
              {batchMutation.isPending ? "Scoring..." : "Score Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
