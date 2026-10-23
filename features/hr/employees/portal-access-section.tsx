"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToggleDashboardAccess } from "@/lib/api/hooks/hr";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { getErrorMessage } from "@/lib/get-error-message";

interface PortalAccessSectionProps {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  initialHasAccess: boolean;
  /** False for a terminated / deactivated account: access cannot be turned on. */
  isAccountActive?: boolean;
  currentUserId?: string;
}

export function PortalAccessSection({
  employeeId,
  employeeName,
  employeeRole,
  initialHasAccess,
  isAccountActive = true,
  currentUserId,
}: PortalAccessSectionProps) {
  const toggleAccess = useToggleDashboardAccess();
  const [hasAccess, setHasAccess] = useState(initialHasAccess);
  // The access value the open confirm dialog would apply (R2-ROLE-3: ON is
  // confirmed too, not applied on the first click).
  const [confirmNext, setConfirmNext] = useState<boolean | null>(null);

  const isLocked = employeeRole === "CEO" || employeeId === currentUserId;

  const applyChange = useCallback(
    (next: boolean) => {
      toggleAccess.mutate(
        { userId: employeeId, hasDashboardAccess: next },
        {
          onSuccess: () => {
            setHasAccess(next);
            toast.success(`Portal access ${next ? "enabled" : "disabled"}`);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [employeeId, toggleAccess],
  );

  // R2-HRROLE-01: a terminated / inactive account cannot get access back.
  const cannotEnable = !isAccountActive && !hasAccess;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Portal Access</h3>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-sunken px-4 py-3">
        <div className="space-y-1 pr-4">
          <p className="text-sm font-medium text-foreground">
            {hasAccess ? "Access enabled" : "Access disabled"}
          </p>
          <p className="text-xs text-muted-foreground">
            Controls whether {employeeName} can sign in and use the application.
            {isLocked ? " This account always retains access." : ""}
            {cannotEnable ? " This account is deactivated, so access cannot be turned on." : ""}
          </p>
        </div>
        <Switch
          checked={hasAccess}
          disabled={isLocked || cannotEnable || toggleAccess.isPending}
          onCheckedChange={setConfirmNext}
          aria-label={`Toggle portal access for ${employeeName}`}
        />
      </div>

      <ConfirmActionDialog
        open={confirmNext !== null}
        onOpenChange={(open) => !open && setConfirmNext(null)}
        title={confirmNext ? "Enable Portal Access" : "Disable Portal Access"}
        description={
          confirmNext
            ? `${employeeName} will be able to sign in and use the application again.`
            : `Disabling portal access for ${employeeName} will block their access to the entire application. They will be signed out on their next page load and cannot log in until access is re-enabled.`
        }
        confirmLabel={confirmNext ? "Enable Access" : "Disable Access"}
        cancelLabel="Cancel"
        variant={confirmNext ? "default" : "destructive"}
        isPending={toggleAccess.isPending}
        onConfirm={() => {
          if (confirmNext !== null) applyChange(confirmNext);
          setConfirmNext(null);
        }}
      />
    </div>
  );
}
