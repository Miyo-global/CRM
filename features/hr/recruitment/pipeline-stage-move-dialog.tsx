"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  getPipelineStageEmailDescription,
  type PipelineStageEmailKind,
} from "@/lib/hr/pipeline-stage-email";

export interface PipelineStageMoveRequest {
  entityId: number;
  entityName: string;
  stageLabel: string;
  emailKind: PipelineStageEmailKind | null;
}

interface PipelineStageMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  move: PipelineStageMoveRequest | null;
  isPending?: boolean;
  onConfirm: (sendEmail: boolean) => void;
}

export function PipelineStageMoveDialog({
  open,
  onOpenChange,
  move,
  isPending = false,
  onConfirm,
}: PipelineStageMoveDialogProps) {
  const isReject = move?.emailKind === "rejected";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Move to {move?.stageLabel ?? "stage"}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Move{" "}
                <span className="font-semibold text-foreground">{move?.entityName}</span>{" "}
                to{" "}
                <span className={isReject ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
                  {move?.stageLabel}
                </span>
                ?
              </p>
              {move?.emailKind ? (
                <p>{getPipelineStageEmailDescription(move.emailKind)}</p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onConfirm(false)}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Move, no email
          </Button>
          <Button
            type="button"
            disabled={isPending || !move?.emailKind}
            title={!move?.emailKind ? "No email template for this stage" : undefined}
            variant={isReject ? "destructive" : "default"}
            onClick={() => onConfirm(true)}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Move &amp; send email
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
