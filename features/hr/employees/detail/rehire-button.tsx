"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSetEmployeeActive } from "@/lib/api/hooks/hr";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

/**
 * R4b: re-hire a terminated / exited employee from their profile header.
 * The server reactivates the account and Portal Access, starts a fresh
 * onboarding checklist and writes an "hr.employee_rehired" audit event.
 */
export function RehireButton({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const router = useRouter();
  const setActive = useSetEmployeeActive();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const rehire = () =>
    setActive.mutate(
      { userId: employeeId, isActive: true, reason: reason.trim(), rehire: true },
      {
        onSuccess: (res) => {
          setOpen(false);
          setReason("");
          toast.success(
            res?.checklistStarted === false
              ? "Employee re-hired. The onboarding checklist could not be started; initiate it from Onboarding."
              : "Employee re-hired. Portal access is on and a new onboarding checklist has started.",
          );
          router.refresh();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to re-hire employee"),
      },
    );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} title="Re-hire this employee">
        <UserCheck className="size-4" aria-hidden="true" />
        Rehire
      </Button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Re-hire employee"
        description={`Re-hire ${employeeName}? Their account and portal access are turned back on with the same Employee ID, and a fresh onboarding checklist starts today. This is recorded in the audit log.`}
        confirmLabel="Rehire"
        cancelLabel="Cancel"
        variant="default"
        isPending={setActive.isPending}
        confirmDisabled={reason.trim().length < 3}
        onConfirm={rehire}
      >
        <div className="space-y-1.5">
          <Label htmlFor="rehire-reason">Reason</Label>
          <Textarea
            id="rehire-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Why is this person being re-hired?"
          />
        </div>
      </ConfirmActionDialog>
    </>
  );
}
