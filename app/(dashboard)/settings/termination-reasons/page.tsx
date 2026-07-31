"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Plus, Settings } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { HrSheet } from "@/features/hr/hr-sheet";

import {
  useTerminationReasons,
  useCreateTerminationReason,
  useUpdateTerminationReason,
  type TerminationReason,
} from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { terminationReasonFormSchema } from "@/lib/validations/termination-reasons";
import { OTHER_TERMINATION_REASON } from "@/lib/constants/hr-separation";

export default function TerminationReasonsSettingsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "ADMIN"]}>
      <TerminationReasonsContent />
    </DashboardGate>
  );
}

function TerminationReasonsContent() {
  const { data: reasons, isLoading } = useTerminationReasons();
  const createReason = useCreateTerminationReason();
  const updateReason = useUpdateTerminationReason();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TerminationReason | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const sorted = useMemo(
    () =>
      [...(reasons ?? [])].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id
      ),
    [reasons]
  );

  const activeCount = useMemo(
    () => sorted.filter((r) => r.isActive).length,
    [sorted]
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setLabel("");
    setDescription("");
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((reason: TerminationReason) => {
    setEditing(reason);
    setLabel(reason.label);
    setDescription(reason.description ?? "");
    setSheetOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    (reason: TerminationReason, next: boolean) => {
      updateReason.mutate(
        { id: reason.id, isActive: next },
        {
          onSuccess: () =>
            toast.success(next ? "Reason activated" : "Reason deactivated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [updateReason]
  );

  const handleSubmit = useCallback(() => {
    const parsed = terminationReasonFormSchema.safeParse({ label, description });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid reason");
      return;
    }

    const trimmed = parsed.data.label;

    if (editing) {
      updateReason.mutate(
        {
          id: editing.id,
          label: trimmed,
          description: parsed.data.description?.trim() || null,
        },
        {
          onSuccess: () => {
            toast.success("Reason updated");
            setSheetOpen(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
      return;
    }

    createReason.mutate(
      { label: trimmed, description: parsed.data.description?.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Reason added");
          setSheetOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [label, description, editing, createReason, updateReason]);

  return (
    <PageWrapper
      title="Termination reasons"
      subtitle="Configure the reasons available when creating a termination."
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/hr/termination">
              <Settings className="h-3.5 w-3.5 mr-1" />
              Termination page
            </Link>
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add reason
          </Button>
        </div>
      }
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Reasons</CardTitle>
          <CardDescription>
            Active reasons appear as selectable options on{" "}
            <Link
              href="/hr/termination"
              className="underline underline-offset-2"
            >
              Termination Management
            </Link>
            . Deactivated reasons are hidden from new terminations but kept for
            historical records. Defaults are seeded automatically the first time
            this page loads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reasons configured yet. Add one above.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {activeCount} active · {sorted.length} total
              </p>
              <ul className="divide-y rounded-md border">
                {sorted.map((reason) => (
                  <li
                    key={reason.id}
                    className="flex items-start justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {reason.label}
                        </span>
                        {!reason.isActive && (
                          <Badge variant="outline" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                        {reason.label === OTHER_TERMINATION_REASON && (
                          <Badge variant="secondary" className="text-[10px]">
                            System
                          </Badge>
                        )}
                      </div>
                      {reason.description && (
                        <p className="text-xs text-muted-foreground">
                          {reason.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(reason)}
                        aria-label={`Edit ${reason.label}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Switch
                        checked={!!reason.isActive}
                        onCheckedChange={(next) =>
                          handleToggleActive(reason, next)
                        }
                        disabled={updateReason.isPending}
                        aria-label={`${reason.isActive ? "Deactivate" : "Activate"} ${reason.label}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditing(null);
            setLabel("");
            setDescription("");
          }
        }}
        title={editing ? "Edit reason" : "Add reason"}
        description={
          editing
            ? "Update the label or description for this termination reason."
            : "Create a new termination reason for your organization."
        }
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save changes" : "Add reason"}
        isPending={createReason.isPending || updateReason.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="reason-label" className="text-sm font-medium">
            Label <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reason-label"
            value={label}
            maxLength={200}
            placeholder="e.g. Repeated policy violations"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reason-description" className="text-sm font-medium">
            Description{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="reason-description"
            value={description}
            maxLength={2000}
            rows={3}
            placeholder="Internal guidance on when to use this reason..."
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
