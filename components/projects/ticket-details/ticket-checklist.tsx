"use client";

import { useState } from "react";
import { ListChecks, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useTicketChecklist,
  useChecklistMutations,
  type TicketChecklistItem,
} from "@/lib/api/hooks/projects";

/**
 * MIYO-0111: a flat checklist on a ticket. Items are added, ticked, moved and
 * deleted; the same counts drive the "2/5" badge on the board card.
 */
export function TicketChecklist({
  ticketId,
  projectId,
  readOnly = false,
}: {
  ticketId: number;
  projectId: number;
  readOnly?: boolean;
}) {
  const { data, isLoading } = useTicketChecklist(ticketId, projectId);
  const { add, update, remove } = useChecklistMutations(ticketId, projectId);
  const [title, setTitle] = useState("");

  const items: TicketChecklistItem[] = data ?? [];
  const done = items.filter((i) => i.isDone).length;

  const fail = (e: unknown) => toast.error(getErrorMessage(e));

  const addItem = () => {
    const value = title.trim();
    if (!value) return;
    setTitle("");
    add.mutate(value, { onError: fail });
  };

  /** Swap positions with the neighbour, so a move is two small writes. */
  const move = (index: number, direction: -1 | 1) => {
    const item = items[index];
    const neighbour = items[index + direction];
    if (!item || !neighbour) return;
    update.mutate({ id: item.id, position: neighbour.position }, { onError: fail });
    update.mutate({ id: neighbour.id, position: item.position }, { onError: fail });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Checklist</h3>
        {items.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {done}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <Progress
          value={(done / items.length) * 100}
          aria-label={`${done} of ${items.length} checklist items done`}
        />
      )}

      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
            <Checkbox
              checked={item.isDone}
              disabled={readOnly || update.isPending}
              onCheckedChange={(checked) =>
                update.mutate({ id: item.id, isDone: checked === true }, { onError: fail })
              }
              aria-label={item.title}
            />
            <span
              className={
                item.isDone
                  ? "min-w-0 flex-1 break-words text-sm text-muted-foreground line-through"
                  : "min-w-0 flex-1 break-words text-sm"
              }
            >
              {item.title}
            </span>
            {!readOnly && (
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0 || update.isPending}
                  onClick={() => move(index, -1)}
                  aria-label={`Move ${item.title} up`}
                >
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === items.length - 1 || update.isPending}
                  onClick={() => move(index, 1)}
                  aria-label={`Move ${item.title} down`}
                >
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-danger-soft hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(item.id, { onError: fail })}
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <Input
            value={title}
            maxLength={300}
            placeholder="Add a checklist item"
            aria-label="New checklist item"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={!title.trim() || add.isPending}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        </div>
      )}
    </section>
  );
}
