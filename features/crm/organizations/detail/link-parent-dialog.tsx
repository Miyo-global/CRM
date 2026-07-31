"use client";

import { useState, useCallback } from "react";
import { Search, Check, X, Link2Off } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrmOrganizations, useUpdateCrmOrganization } from "@/lib/api/hooks/crm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LinkParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  currentParentId: number | null;
}

export function LinkParentDialog({
  open,
  onOpenChange,
  organizationId,
  currentParentId,
}: LinkParentDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(currentParentId);

  const { data, isLoading } = useCrmOrganizations({ search: search || undefined, limit: 30 });
  const updateMutation = useUpdateCrmOrganization();

  const candidates = (data?.organizations ?? []).filter(
    (o) => o.id !== organizationId && o.parentId !== organizationId,
  );

  const handleConfirm = useCallback(() => {
    updateMutation.mutate(
      { id: organizationId, parentId: selectedId },
      {
        onSuccess: () => {
          toast.success(selectedId ? "Parent account linked" : "Parent account unlinked");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }, [organizationId, selectedId, updateMutation, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Link Parent Account</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-56">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <div className="space-y-1 p-1">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                  selectedId === null
                    ? "bg-gold/10 text-gold"
                    : "hover:bg-accent text-muted-foreground",
                )}
              >
                <Link2Off className="h-3.5 w-3.5 shrink-0" />
                <span>No parent (top-level account)</span>
                {selectedId === null && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
              </button>

              {candidates.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedId(org.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                    selectedId === org.id
                      ? "bg-gold/10 text-gold"
                      : "hover:bg-accent text-foreground",
                  )}
                >
                  <span className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {org.name[0]?.toUpperCase()}
                  </span>
                  <span className="truncate">{org.name}</span>
                  {org.industry && (
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">{org.industry}</span>
                  )}
                  {selectedId === org.id && <Check className="h-3.5 w-3.5 ml-2 shrink-0" />}
                </button>
              ))}

              {candidates.length === 0 && !isLoading && (
                <p className="text-center text-sm text-muted-foreground py-4">No organizations found</p>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 border-t pt-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button
            className="flex-1 bg-gold hover:bg-gold/90 text-white"
            onClick={handleConfirm}
            disabled={updateMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            {selectedId ? "Link Parent" : "Remove Parent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
