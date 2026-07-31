"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X, Tag } from "lucide-react";
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
}

const PRESET_COLORS = ["#3B82F6", "#EF4444", "#22C55E", "#EAB308", "#8B5CF6", "#EC4899", "#F97316", "#06B6D4"];

export function LabelPicker({ ticketId, projectId, currentLabels }: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
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
  const availableLabels = allLabels?.filter(l => !currentLabelIds.has(l.id)) || [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Tag className="h-3.5 w-3.5" />
        Labels
      </div>
      <div className="flex flex-wrap gap-1.5">
        {currentLabels.map(({ label }) => (
          <Badge
            key={label.id}
            variant="secondary"
            className="gap-1 pl-1.5 pr-1 py-0.5 text-xs cursor-default"
            style={{ borderLeft: `3px solid ${label.color || "#3b82f6"}` }}
          >
            {label.name}
            <button
              onClick={() => removeLabel.mutate({ ticketId, projectId, labelId: label.id })}
              className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              {availableLabels.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {availableLabels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => {
                        addLabel.mutate({ ticketId, projectId, labelId: label.id });
                      }}
                      className="flex items-center gap-2 w-full p-1.5 text-sm rounded hover:bg-muted transition-colors text-left"
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: label.color || "#3b82f6" }}
                      />
                      {label.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t pt-2 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Create new label</p>
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name"
                  className="h-7 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newLabelName.trim()) {
                      createLabel.mutate({ name: newLabelName.trim(), color: selectedColor });
                    }
                  }}
                />
                <div className="flex gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className="w-5 h-5 rounded-full transition-transform"
                      style={{
                        backgroundColor: c,
                        transform: selectedColor === c ? "scale(1.2)" : "scale(1)",
                        outline: selectedColor === c ? "2px solid currentColor" : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  disabled={!newLabelName.trim() || createLabel.isPending}
                  onClick={() => {
                    if (newLabelName.trim()) {
                      createLabel.mutate({ name: newLabelName.trim(), color: selectedColor });
                    }
                  }}
                >
                  Create & Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
