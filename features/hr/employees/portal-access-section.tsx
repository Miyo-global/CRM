"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToggleDashboardAccess } from "@/lib/api/hooks/hr";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

interface PortalAccessSectionProps {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  initialHasAccess: boolean;
  currentUserId?: string;
}

export function PortalAccessSection({
  employeeId,
  employeeName,
  employeeRole,
  initialHasAccess,
  currentUserId,
}: PortalAccessSectionProps) {
  const toggleAccess = useToggleDashboardAccess();
  const [hasAccess, setHasAccess] = useState(initialHasAccess);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
          onError: () => toast.error("Failed to update portal access"),
        },
      );
    },
    [employeeId, toggleAccess],
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Portal Access</h3>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div className="space-y-1 pr-4">
          <p className="text-sm font-medium text-foreground">
            {hasAccess ? "Access enabled" : "Access disabled"}
          </p>
          <p className="text-xs text-muted-foreground">
            Controls whether {employeeName} can sign in and use the application.
            {isLocked ? " This account always retains access." : ""}
          </p>
        </div>
        <Switch
          checked={hasAccess}
          disabled={isLocked || toggleAccess.isPending}
          onCheckedChange={handleToggle}
          aria-label={`Toggle portal access for ${employeeName}`}
        />
      </div>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Disable Portal Access"
        description={`Disabling portal access for ${employeeName} will block their access to the entire application. They will be signed out on their next page load and cannot log in until access is re-enabled.`}
        confirmLabel="Disable Access"
        cancelLabel="Cancel"
        variant="destructive"
        isPending={toggleAccess.isPending}
        onConfirm={() => {
          applyChange(false);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
