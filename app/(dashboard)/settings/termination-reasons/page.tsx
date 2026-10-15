"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Plus, Settings, UserX } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatusPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
              <Settings aria-hidden />
              Termination page
            </Link>
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus aria-hidden />
            Add reason
          </Button>
        </div>
      }
    >
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Reasons</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Active reasons appear as selectable options on{" "}
              <Link
                href="/hr/termination"
                className="text-brand-text underline underline-offset-2"
              >
                Termination Management
              </Link>
              . Deactivated reasons are hidden from new terminations but kept for
              historical records.
            </p>
          </div>
          {!isLoading && sorted.length > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {activeCount} active · {sorted.length} total
            </p>
          )}
        </div>
        {isLoading ? (
          <div className="p-5">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              icon={UserX}
              title="No reasons configured yet. Add one above."
              action={{ label: "Add reason", onClick: openCreate }}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((reason) => (
                <TableRow key={reason.id}>
                  <TableCell className="max-w-0 w-full whitespace-normal">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{reason.label}</span>
                      {reason.label === OTHER_TERMINATION_REASON && (
                        <StatusPill tone="info">System</StatusPill>
                      )}
                    </div>
                    {reason.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{reason.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={reason.isActive ? "success" : "neutral"} dot>
                      {reason.isActive ? "Active" : "Inactive"}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(reason)}
                        aria-label={`Edit ${reason.label}`}
                      >
                        <Pencil aria-hidden />
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
