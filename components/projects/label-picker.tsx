"use client";

import { CHART_PRESET_HEX } from "@/lib/design/brand-hex";
import { toneVar } from "@/lib/design/tones";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X, Tag, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useLabels,
  useCreateOrgLabel,
  useAddLabelToTicket,
  useRemoveLabelFromTicket,
} from "@/lib/hooks/trpc-hooks";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface LabelPickerProps {
  ticketId: number;
  projectId?: number;
  currentLabels: Array<{ label: { id: number; name: string; color: string | null } }>;
  readOnly?: boolean;
}

const PRESET_COLORS: readonly string[] = CHART_PRESET_HEX;

export function LabelPicker({ ticketId, projectId, currentLabels, readOnly = false }: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const queryClient = useQueryClient();

  const { data: allLabels } = useLabels();

  const createLabel = useCreateOrgLabel({
    onSuccess: (newLabel) => {
      setNewLabelName("");
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.labels() });
      addLabel.mutate({ ticketId, projectId, labelId: newLabel.id });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const addLabel = useAddLabelToTicket({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.ticket(ticketId) });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const removeLabel = useRemoveLabelFromTicket({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.ticket(ticketId) });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const currentLabelIds = new Set(currentLabels.map(l => l.label.id));
  const query = newLabelName.trim().toLowerCase();
  const visibleLabels = (allLabels ?? []).filter(
    (l) => !query || l.name.toLowerCase().includes(query)
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Tag className="size-3.5" aria-hidden="true" />
        Labels
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {currentLabels.map(({ label }) => (
          <Badge key={label.id} variant="secondary" className="cursor-default gap-1.5 pr-0.5">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: label.color || toneVar.neutral }}
            />
            {label.name}
            {!readOnly && (
            <button
              type="button"
              aria-label={`Remove ${label.name}`}
              onClick={() => removeLabel.mutate({ ticketId, projectId, labelId: label.id })}
              className="inline-flex size-4 items-center justify-center rounded-full transition-colors hover:bg-danger-soft hover:text-danger-strong focus-visible:focus-ring"
            >
              <X className="size-2.5" aria-hidden="true" />
            </button>
            )}
          </Badge>
        ))}
        {!readOnly && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="rounded-full" aria-label="Add label">
              <Plus className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="relative border-b border-border p-2">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label name"
                className="h-8 pl-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newLabelName.trim()) {
                    createLabel.mutate({ name: newLabelName.trim(), color: selectedColor });
                  }
                }}
              />
            </div>
            {visibleLabels.length > 0 && (
              <div className="max-h-48 space-y-0.5 overflow-y-auto p-1" role="listbox" aria-multiselectable="true">
                {visibleLabels.map((label) => {
                  const selected = currentLabelIds.has(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        if (selected) {
                          removeLabel.mutate({ ticketId, projectId, labelId: label.id });
                        } else {
                          addLabel.mutate({ ticketId, projectId, labelId: label.id });
                        }
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:focus-ring"
                    >
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color || toneVar.neutral }}
                      />
                      <span className="min-w-0 flex-1 truncate">{label.name}</span>
                      {selected && <Check className="size-3.5 text-brand-text" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="space-y-2 border-t border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Create new label</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    aria-pressed={selectedColor === c}
                    onClick={() => setSelectedColor(c)}
                    className={cn(
                      "size-5 rounded-full transition-transform focus-visible:focus-ring",
                      selectedColor === c && "scale-110 ring-2 ring-ring ring-offset-2 ring-offset-popover"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={!newLabelName.trim() || createLabel.isPending}
                loading={createLabel.isPending}
                onClick={() => {
                  if (newLabelName.trim()) {
                    createLabel.mutate({ name: newLabelName.trim(), color: selectedColor });
                  }
                }}
              >
                Create & Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        )}
      </div>
    </div>
  );
}
