"use client";

import { useState } from "react";
import { Zap, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAssignCrmReps, useCrmAssignmentStats } from "@/lib/api/hooks/crm";

export function AssignCrmDialog() {
  const [open, setOpen] = useState(false);
  const { data: stats, isLoading: statsLoading } = useCrmAssignmentStats(open);
  const mutation = useAssignCrmReps();

  const handleAssign = async () => {
    try {
      await mutation.mutateAsync();
      toast.success("CRM representatives assigned successfully via round-robin");
      setOpen(false);
    } catch {
      toast.error("Failed to assign CRM representatives. Please try again.");
    }
  };

  const members = stats?.members ?? [];
  const unassignedCount = stats?.unassignedCount ?? 0;
  const totalActive = members.reduce((sum, m) => sum + m.activeCount, 0);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2"
        onClick={() => setOpen(true)}
        disabled={mutation.isPending}
      >
        <Zap className="h-4 w-4" />
        <span className="hidden sm:inline">Assign CRM</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              CRM Assignment Overview
            </DialogTitle>
            <DialogDescription>
              Round-robin assigns unassigned clients to CRM reps with the fewest active accounts.
            </DialogDescription>
          </DialogHeader>

          {!statsLoading && unassignedCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <span className="font-semibold">{unassignedCount}</span> client{unassignedCount !== 1 ? "s" : ""} unassigned
              </p>
            </div>
          )}

          {!statsLoading && unassignedCount === 0 && members.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                All clients are assigned
              </p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
              CRM Representatives ({members.length})
            </p>

            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-10" />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium">No CRM representatives found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add members with CUSTOMER_SUPPORT role to enable assignment.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border divide-y max-h-[280px] overflow-y-auto">
                {[...members]
                  .sort((a, b) => a.activeCount - b.activeCount)
                  .map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.image || ""} />
                        <AvatarFallback className="text-xs">
                          {member.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.totalCount} total client{member.totalCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={member.activeCount === 0 ? "secondary" : "default"}
                          className="text-xs tabular-nums"
                        >
                          {member.activeCount} active
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {!statsLoading && members.length > 0 && (
              <div className="flex items-center justify-between px-1 pt-1 text-xs text-muted-foreground">
                <span>{totalActive} active across {members.length} reps</span>
                {members.length > 0 && (
                  <span>
                    Avg: {(totalActive / members.length).toFixed(1)} per rep
                  </span>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleAssign}
              disabled={mutation.isPending || members.length === 0 || unassignedCount === 0}
            >
              {mutation.isPending ? "Assigning..." : `Assign ${unassignedCount} Client${unassignedCount !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
