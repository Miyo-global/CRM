"use client";

import { FileText, Library } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useKbPages, useKbSpaces, useMoveKbPage } from "@/lib/api/hooks/knowledge";
import { cn } from "@/lib/utils";

/**
 * KB-0082: move a page under another page, or to a space root.
 *
 * The page's own subtree is disabled rather than hidden: seeing why a target is
 * unavailable beats wondering where it went. The server refuses the same move
 * with a 400 if this is bypassed.
 */
export function MovePageDialog({
  pageId,
  pageTitle,
  descendantIds,
  open,
  onOpenChange,
}: {
  pageId: number;
  pageTitle: string;
  /** The page itself and everything under it, from the tree already loaded. */
  descendantIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 250);
  const [target, setTarget] = useState<
    { kind: "page"; id: number; label: string } | { kind: "space"; id: number; label: string } | null
  >(null);

  const spaces = useKbSpaces({ q: debounced.trim() || undefined });
  const pages = useKbPages({ q: debounced.trim() || undefined, limit: 20 });
  const movePage = useMoveKbPage(pageId);

  const blocked = new Set([pageId, ...descendantIds]);

  function submit() {
    if (!target) return;
    movePage.mutate(
      target.kind === "page"
        ? { parentPageId: target.id }
        : { parentPageId: null, spaceId: target.id },
      {
        onSuccess: () => {
          toast.success(`Moved to ${target.label}`);
          onOpenChange(false);
        },
        onError: () => toast.error("Couldn't move the page there."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Move “{pageTitle || "Untitled"}”</DialogTitle>
          <DialogDescription>
            Pick a space, or a page to put this one under. Anything inside this page is unavailable.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search spaces and pages"
          autoFocus
        />

        <div className="max-h-72 overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {(spaces.data?.items ?? []).map((space) => (
              <li key={`space-${space.id}`}>
                <TargetRow
                  icon={<Library className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  label={space.name}
                  hint="Space root"
                  selected={target?.kind === "space" && target.id === space.id}
                  onSelect={() => setTarget({ kind: "space", id: space.id, label: space.name })}
                />
              </li>
            ))}
            {(pages.data?.items ?? []).map((page) => {
              const disabled = blocked.has(page.id);
              return (
                <li key={`page-${page.id}`}>
                  <TargetRow
                    icon={<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    label={page.title || "Untitled"}
                    hint={disabled ? "Inside this page" : undefined}
                    disabled={disabled}
                    selected={target?.kind === "page" && target.id === page.id}
                    onSelect={() =>
                      setTarget({ kind: "page", id: page.id, label: page.title || "Untitled" })
                    }
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!target || movePage.isPending}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TargetRow({
  icon,
  label,
  hint,
  disabled,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        selected ? "bg-brand-soft text-brand-soft-foreground" : "hover:bg-surface-sunken",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {hint ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  );
}
