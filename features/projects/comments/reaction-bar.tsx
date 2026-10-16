"use client";

import { SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToggleReaction } from "@/lib/api/hooks/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const QUICK = ["👍", "🎉", "❤️", "😄", "👀", "🚀"];

type Props = {
  projectId: number;
  ticketId: number;
  commentId: number;
  reactions: { emoji: string; userId: string }[];
  currentUserId?: string;
  disabled?: boolean;
};

export function ReactionBar({ projectId, ticketId, commentId, reactions, currentUserId, disabled }: Props) {
  const toggle = useToggleReaction(projectId, ticketId);
  const groups = new Map<string, string[]>();
  for (const r of reactions) groups.set(r.emoji, [...(groups.get(r.emoji) ?? []), r.userId]);

  const react = (emoji: string) => {
    if (!currentUserId || disabled) return;
    const remove = (groups.get(emoji) ?? []).includes(currentUserId);
    toggle.mutate(
      { commentId, emoji, userId: currentUserId, remove },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {[...groups.entries()].map(([emoji, users]) => {
        const mine = !!currentUserId && users.includes(currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            disabled={disabled}
            aria-pressed={mine}
            aria-label={`${emoji} ${users.length}`}
            className={cn(
              "inline-flex h-7 min-w-10 items-center justify-center gap-1 rounded-full border px-2 text-xs tabular-nums transition-colors focus-visible:focus-ring",
              mine ? "border-primary bg-brand-soft text-brand-text" : "border-border hover:bg-muted",
            )}
          >
            <span aria-hidden="true">{emoji}</span>
            {users.length}
          </button>
        );
      })}
      {!disabled && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="Add reaction">
              <SmilePlus className="size-3.5" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex w-auto gap-1 p-1" align="start">
            {QUICK.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                aria-label={`React with ${emoji}`}
                className="flex size-10 items-center justify-center rounded-md text-lg hover:bg-muted focus-visible:focus-ring"
              >
                {emoji}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
