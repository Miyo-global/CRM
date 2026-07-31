"use client";

import { useState, useCallback } from "react";
import {
  useTicketRelations,
  useAddTicketRelation,
  useRemoveTicketRelation,
} from "@/lib/api/hooks/projects";
import type { WorkItemRelationType } from "@/lib/api/hooks/projects";
import { useProject } from "@/lib/hooks/trpc-hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { Link2, X, Plus, ArrowRight, ArrowLeft, Copy, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketRelationsProps {
  ticketId: number;
  projectId: number;
}

const RELATION_LABELS: Record<WorkItemRelationType, { label: string; icon: React.ReactNode; color: string }> = {
  blocks: {
    label: "Blocks",
    icon: <ArrowRight className="h-3 w-3" />,
    color: "text-destructive",
  },
  blocked_by: {
    label: "Blocked by",
    icon: <ArrowLeft className="h-3 w-3" />,
    color: "text-destructive",
  },
  duplicate_of: {
    label: "Duplicate of",
    icon: <Copy className="h-3 w-3" />,
    color: "text-yellow-600",
  },
  relates_to: {
    label: "Relates to",
    icon: <Minus className="h-3 w-3" />,
    color: "text-muted-foreground",
  },
};

export function TicketRelations({ ticketId, projectId }: TicketRelationsProps) {
  const { data: relations, isLoading } = useTicketRelations(ticketId, projectId);
  const { data: projectData } = useProject(projectId);
  const addRelation = useAddTicketRelation(ticketId, projectId);
  const removeRelation = useRemoveTicketRelation(ticketId, projectId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<WorkItemRelationType>("relates_to");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const allTickets = (projectData?.tickets ?? []).filter((t) => t.id !== ticketId);
  const existingRelatedIds = new Set(
    (relations ?? []).map((r) => r.relatedTicket?.id).filter(Boolean)
  );

  const handleAdd = useCallback(() => {
    if (!selectedTicketId) { toast.error("Select a ticket first"); return; }
    addRelation.mutate(
      { relatedTicketId: selectedTicketId, relationType: selectedType },
      {
        onSuccess: () => {
          toast.success("Relation added");
          setSelectedTicketId(null);
          setPickerOpen(false);
        },
        onError: (e) => toast.error((e as Error).message || "Failed to add relation"),
      }
    );
  }, [selectedTicketId, selectedType, addRelation]);

  if (isLoading) return null;

  const grouped = (relations ?? []).reduce<Record<WorkItemRelationType, typeof relations>>((acc, r) => {
    const t = r.relationType as WorkItemRelationType;
    if (!acc[t]) acc[t] = [];
    acc[t]!.push(r);
    return acc;
  }, {} as Record<WorkItemRelationType, typeof relations>);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          Relations
        </h4>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 space-y-3" align="end">
            <p className="text-xs font-medium">Add Relation</p>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as WorkItemRelationType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RELATION_LABELS) as WorkItemRelationType[]).map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {RELATION_LABELS[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Command>
              <CommandInput placeholder="Search tickets..." className="h-8 text-xs" />
              <CommandList className="max-h-[160px]">
                <CommandEmpty className="py-2 text-xs text-muted-foreground text-center">No tickets found.</CommandEmpty>
                <CommandGroup>
                  {allTickets
                    .filter((t) => !existingRelatedIds.has(t.id))
                    .map((t) => (
                      <CommandItem
                        key={t.id}
                        value={`${t.ticketNumber} ${t.title}`}
                        onSelect={() => setSelectedTicketId(t.id)}
                        className={cn("text-xs", selectedTicketId === t.id && "bg-primary/10")}
                      >
                        <span className="font-mono text-muted-foreground mr-2">#{t.ticketNumber}</span>
                        <span className="truncate">{t.title}</span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleAdd}
              disabled={!selectedTicketId || addRelation.isPending}
            >
              {addRelation.isPending ? "Adding..." : "Add Relation"}
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {(relations ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No relations yet.</p>
      ) : (
        <div className="space-y-1.5">
          {(Object.entries(grouped) as [WorkItemRelationType, typeof relations][]).map(([type, rels]) => {
            const meta = RELATION_LABELS[type];
            if (!rels?.length) return null;
            return (
              <div key={type}>
                <p className={cn("text-[10px] font-medium flex items-center gap-1 mb-0.5", meta.color)}>
                  {meta.icon}
                  {meta.label}
                </p>
                {rels.map((r) => {
                  const t = r.relatedTicket;
                  if (!t) return null;
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-2 py-0.5 pl-4 group">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          #{t.ticketNumber}
                        </span>
                        <span className="text-xs truncate">{t.title}</span>
                        {t.status && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                            {t.status}
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRelation.mutate(t.id, {
                          onError: (e) => toast.error((e as Error).message || "Failed to remove"),
                        })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Remove relation"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
