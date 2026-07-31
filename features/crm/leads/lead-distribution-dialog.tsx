"use client";

import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useDistributeLeads } from "@/lib/api/hooks/leads";
import { toast } from "sonner";

interface LeadDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: number[];
  onSuccess?: () => void;
}

export function LeadDistributionDialog({ open, onOpenChange, leadIds, onSuccess }: LeadDistributionDialogProps) {
  const [skipAbsent, setSkipAbsent] = useState(true);
  const [result, setResult] = useState<{
    distributed: number;
    salesPeople: number;
    totalSalesPeople: number;
    absentCount: number;
    absentNames: string[];
    summary: { userId: string; name: string; count: number }[];
  } | null>(null);

  const distributeMutation = useDistributeLeads();

  const handleDistribute = () => {
    distributeMutation.mutate(
      { leadIds, skipAbsent },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(`${data.distributed} leads distributed to ${data.salesPeople} sales reps`);
          onSuccess?.();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Distribute Leads</SheetTitle>
          <SheetDescription>
            Auto-assign {leadIds.length} lead{leadIds.length > 1 ? "s" : ""} to sales team via round-robin.
          </SheetDescription>
        </SheetHeader>

        {!result ? (
          <>
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Leads to distribute</span>
                </div>
                <Badge variant="secondary" className="text-sm font-bold">{leadIds.length}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="skip-absent" className="text-sm font-medium">Skip absent team members</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Redistributes leads to present members only
                  </p>
                </div>
                <Switch id="skip-absent" checked={skipAbsent} onCheckedChange={setSkipAbsent} />
              </div>

              {!skipAbsent && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400">
                    Leads assigned to absent members will be queued until they return.
                  </p>
                </div>
              )}
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleDistribute} disabled={distributeMutation.isPending}>
                {distributeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Distribute Now
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">Distribution Complete</p>
                  <p className="text-xs text-muted-foreground">
                    {result.distributed} leads assigned to {result.salesPeople} of {result.totalSalesPeople} sales reps
                  </p>
                </div>
              </div>

              {result.absentCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-amber-400 font-medium">{result.absentCount} member{result.absentCount > 1 ? "s" : ""} on leave today</p>
                    <p className="text-xs text-muted-foreground">{result.absentNames.join(", ")}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distribution Summary</p>
                {result.summary.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">{s.name}</span>
                    <Badge variant="secondary">{s.count} lead{s.count > 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <SheetFooter>
              <Button onClick={handleClose}>Done</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
