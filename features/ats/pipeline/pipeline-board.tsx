"use client";

import Link from "next/link";
import { useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";

import {
  KanbanCanvas,
  KanbanColumnShell,
  KanbanEmptyDrop,
  kanbanCardClass,
} from "@/components/shared/kanban";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pluralise } from "@/lib/format-utils";

export interface PipelineStage {
  id: number;
  name: string;
  type: string;
  autoEmail: boolean;
  emailTemplateId: string | null;
}

export interface PipelineCard {
  applicationId: number;
  candidateId: number;
  name: string;
  rating: number | null;
  source: string | null;
  stageId: number | null;
  daysInStage: number;
  /** MIYO-0655: READY or BLOCKED, with a word on why. */
  state: string;
  blockedReason: string | null;
}

export interface RefuseReason {
  id: number;
  name: string;
  emailTemplateId: string | null;
}

interface PendingMove {
  card: PipelineCard;
  stage: PipelineStage;
  fromStageId: number | null;
}

/**
 * MIYO-0651: the board. The card moves at once and goes back if the server
 * refuses; a move into Rejected asks for a reason first, and a stage that
 * sends mail asks before it does.
 */
export function PipelineBoard({
  stages,
  cards: initialCards,
  reasons,
}: {
  stages: PipelineStage[];
  cards: PipelineCard[];
  reasons: RefuseReason[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [reasonId, setReasonId] = useState<string>("");

  async function commit(move: PendingMove, options: { reasonId?: number; sendEmail: boolean }) {
    const { card, stage, fromStageId } = move;
    setCards((rows) =>
      rows.map((row) =>
        row.applicationId === card.applicationId
          ? { ...row, stageId: stage.id, daysInStage: 0 }
          : row,
      ),
    );

    const res = await fetch(`/api/ats/applications/${card.applicationId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId: stage.id,
        reasonId: options.reasonId,
        sendEmail: options.sendEmail,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body?.error ?? "Could not move the candidate.");
      setCards((rows) =>
        rows.map((row) =>
          row.applicationId === card.applicationId ? { ...row, stageId: fromStageId } : row,
        ),
      );
      return;
    }

    const body = await res.json();
    toast.success(body.emailSent ? `Moved to ${stage.name}, email sent.` : `Moved to ${stage.name}.`);
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const stage = stages.find((s) => String(s.id) === result.destination!.droppableId);
    const card = cards.find((c) => String(c.applicationId) === result.draggableId);
    if (!stage || !card || card.stageId === stage.id) return;

    const move: PendingMove = { card, stage, fromStageId: card.stageId };

    // A rejection needs a reason; a stage that mails asks first.
    if (stage.type === "REJECTED" || (stage.autoEmail && stage.emailTemplateId)) {
      setReasonId("");
      setPending(move);
      return;
    }
    void commit(move, { sendEmail: false });
  }

  const isRejection = pending?.stage.type === "REJECTED";
  const chosenReason = reasons.find((r) => String(r.id) === reasonId);

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <KanbanCanvas>
          {stages.map((stage) => {
            const stageCards = cards.filter((card) => card.stageId === stage.id);
            return (
              <Droppable droppableId={String(stage.id)} key={stage.id}>
                {(provided, snapshot) => (
                  <KanbanColumnShell
                    title={stage.name}
                    tone="neutral"
                    count={stageCards.length}
                    isDraggingOver={snapshot.isDraggingOver}
                    innerRef={provided.innerRef}
                    droppableProps={provided.droppableProps}
                  >
                    {stageCards.length === 0 && !snapshot.isDraggingOver && <KanbanEmptyDrop />}
                    {stageCards.map((card, index) => (
                      <Draggable
                        draggableId={String(card.applicationId)}
                        index={index}
                        key={card.applicationId}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={kanbanCardClass(dragSnapshot.isDragging)}
                          >
                            <Link
                              href={`/ats/candidates/${card.candidateId}`}
                              className="text-sm font-medium text-foreground"
                            >
                              {card.name}
                            </Link>
                            {card.state === "BLOCKED" && (
                              <p className="mt-1 text-xs text-foreground">
                                Blocked{card.blockedReason ? `: ${card.blockedReason}` : ""}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[
                                card.rating ? `${card.rating}/5` : null,
                                card.source,
                                pluralise(card.daysInStage, "day"),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </KanbanColumnShell>
                )}
              </Droppable>
            );
          })}
        </KanbanCanvas>
      </DragDropContext>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRejection ? "Reject this candidate" : `Move to ${pending?.stage.name}`}
            </DialogTitle>
            <DialogDescription>
              {isRejection
                ? "Pick a reason. Some reasons send the candidate a note; Withdrew sends nothing."
                : "This stage sends the candidate an email. You can move them without it."}
            </DialogDescription>
          </DialogHeader>

          {isRejection && (
            <Select value={reasonId || undefined} onValueChange={setReasonId}>
              <SelectTrigger aria-label="Reason">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.id} value={String(reason.id)}>
                    {reason.name}
                    {reason.emailTemplateId ? "" : " (no email)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!pending) return;
                const move = pending;
                setPending(null);
                void commit(move, {
                  reasonId: chosenReason?.id,
                  sendEmail: false,
                });
              }}
              disabled={isRejection && !chosenReason}
            >
              Move without email
            </Button>
            <Button
              onClick={() => {
                if (!pending) return;
                const move = pending;
                setPending(null);
                void commit(move, { reasonId: chosenReason?.id, sendEmail: true });
              }}
              disabled={isRejection && !chosenReason}
            >
              {isRejection ? "Reject and send" : "Move and send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
