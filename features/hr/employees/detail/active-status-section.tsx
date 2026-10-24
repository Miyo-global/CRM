"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserCog } from "lucide-react";
import { useSetEmployeeActive } from "@/lib/api/hooks/hr";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ActiveStatusSectionProps {
  employeeId: string;
  employeeName: string;
  initialIsActive: boolean;
}

/**
 * D7: admin control to mark an employee inactive / active. This is a
 * lightweight suspend / reactivate that is intentionally separate from the
 * full termination workflow (CEO review, settlement, asset returns).
 */
export function ActiveStatusSection({
  employeeId,
  employeeName,
  initialIsActive,
}: ActiveStatusSectionProps) {
  const router = useRouter();
  const setActive = useSetEmployeeActive();
  const [isActive, setIsActive] = useState(initialIsActive);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setIsActive(initialIsActive);
  }, [initialIsActive]);

  const applyChange = useCallback(
    (next: boolean, why?: string) => {
      setActive.mutate(
        { userId: employeeId, isActive: next, reason: why },
        {
          onSuccess: (res) => {
            setIsActive(next);
            setActivateOpen(false);
            setReason("");
            toast.success(
              res?.rehired
                ? "Employee re-hired. Portal access stays off until you turn it on."
                : next ? "Employee marked active" : "Employee marked inactive",
            );
            router.refresh();
          },
          onError: (e) =>
            toast.error(e instanceof Error ? e.message : "Failed to update active status"),
        },
      );
    },
    [employeeId, setActive, router],
  );

  const handleToggle = useCallback(
    (next: boolean) => {
      // R3-SA-02: re-activation is confirmed with a reason; for a terminated
      // employee the server records it as a re-hire.
      if (next) setActivateOpen(true);
      else setConfirmOpen(true);
    },
    [],
  );

  const handleConfirmDeactivate = useCallback(() => {
    applyChange(false);
    setConfirmOpen(false);
  }, [applyChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Account Status</h3>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-sunken px-4 py-3">
        <div className="space-y-1 pr-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {isActive ? "Active" : "Inactive"}
            </p>
            <Badge variant={isActive ? "secondary" : "outline"} className="text-2xs">
              {isActive ? "Working" : "Suspended"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Temporarily suspend or reactivate this employee. This is separate
            from termination — to permanently off-board (with settlement and
            asset returns) use the termination workflow instead.
          </p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={setActive.isPending}
          aria-label={isActive ? "Mark inactive" : "Mark active"}
        />
      </div>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Mark employee inactive"
        description={`Mark ${employeeName} as inactive? They will be removed from the active directory and lose access until reactivated. This does not run the termination workflow.`}
        confirmLabel="Mark inactive"
        cancelLabel="Cancel"
        variant="destructive"
        isPending={setActive.isPending}
        onConfirm={handleConfirmDeactivate}
      />

      <ConfirmActionDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title="Re-activate employee"
        description={`Re-activate ${employeeName}? If they were terminated this is recorded as a re-hire on the termination record and in the audit log. Portal access stays off until you turn it on.`}
        confirmLabel="Re-activate"
        cancelLabel="Cancel"
        variant="default"
        isPending={setActive.isPending}
        confirmDisabled={reason.trim().length < 3}
        onConfirm={() => applyChange(true, reason.trim())}
      >
        <div className="space-y-1.5">
          <Label htmlFor="reactivate-reason">Reason</Label>
          <Textarea
            id="reactivate-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Why is this person being re-activated?"
          />
        </div>
      </ConfirmActionDialog>
    </div>
  );
}
