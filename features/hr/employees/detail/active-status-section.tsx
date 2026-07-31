"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserCog } from "lucide-react";
import { useSetEmployeeActive } from "@/lib/api/hooks/hr";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

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

  useEffect(() => {
    setIsActive(initialIsActive);
  }, [initialIsActive]);

  const applyChange = useCallback(
    (next: boolean) => {
      setActive.mutate(
        { userId: employeeId, isActive: next },
        {
          onSuccess: () => {
            setIsActive(next);
            toast.success(next ? "Employee marked active" : "Employee marked inactive");
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
      if (!next) {
        setConfirmOpen(true);
        return;
      }
      applyChange(true);
    },
    [applyChange],
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

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div className="space-y-1 pr-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {isActive ? "Active" : "Inactive"}
            </p>
            <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px]">
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
    </div>
  );
}
