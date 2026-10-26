"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatProfessionalTax, ptAmountSchema } from "@/lib/validations/professional-tax";
import {
  PT_HELPER_TEXT,
  PT_LABEL,
  ProfessionalTaxInput,
  ProfessionalTaxNotApplicable,
  professionalTaxAnnualWarning,
} from "@/components/hr/professional-tax-input";

interface ProfessionalTaxState {
  userId: string;
  professionalTax: string | null;
  hasSalaryStructure: boolean;
  canEdit: boolean;
}

/**
 * PT row on the employee profile's Compensation card, for HR/Admin/Super Admin.
 * The server decides who may see (hr:payroll:pt:view) and edit it; a 403 just
 * hides the row.
 */
export function ProfessionalTaxEditor({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const queryKey = ["hr", "professional-tax", userId];
  const { data, isError, error: loadError } = useQuery({
    queryKey,
    queryFn: () => apiClient.get<ProfessionalTaxState>(`/hr/salary-structures/${userId}/professional-tax`),
    retry: false,
  });

  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const [notApplicable, setNotApplicable] = useState(false);

  const parsed = ptAmountSchema.safeParse(notApplicable ? null : raw);
  const error = parsed.success ? null : parsed.error.issues[0]?.message ?? "Enter a valid amount";
  const warning = !notApplicable && parsed.success ? professionalTaxAnnualWarning(raw) : null;

  const save = useMutation({
    mutationFn: () =>
      apiClient.patch<ProfessionalTaxState>(`/hr/salary-structures/${userId}/professional-tax`, {
        professionalTax: notApplicable ? null : raw,
      }),
    onSuccess: (next) => {
      qc.setQueryData(queryKey, next);
      setEditing(false);
      toast.success("Professional tax saved.");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isError) {
    // 403/404: this viewer may not see PT, so the row is simply absent.
    const status = (loadError as { response?: { status?: number } } | null)?.response?.status;
    if (status === 403 || status === 404) return null;
    return (
      <div className="grid grid-cols-[120px_1fr] gap-x-4 text-sm">
        <dt className="truncate text-muted-foreground">Professional Tax</dt>
        <dd className="text-muted-foreground">Couldn&apos;t load. Refresh to try again.</dd>
      </div>
    );
  }
  if (!data) return null;

  const startEdit = () => {
    setRaw(data.professionalTax ?? "");
    setNotApplicable(data.professionalTax == null);
    setEditing(true);
  };

  if (!editing) {
    return (
      <div className="grid grid-cols-[120px_1fr] gap-x-4 text-sm">
        <dt className="truncate text-muted-foreground">Professional Tax</dt>
        <dd className="flex min-w-0 flex-wrap items-center gap-x-3 text-foreground tabular-nums">
          {formatProfessionalTax(data.professionalTax)}
          {data.canEdit && data.hasSalaryStructure && (
            <Button type="button" variant="link" size="sm" className="h-auto min-h-11 p-0" onClick={startEdit}>
              Edit
            </Button>
          )}
        </dd>
      </div>
    );
  }

  const inputId = `pt-${userId}`;
  return (
    <form
      className="space-y-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed.success) save.mutate();
      }}
    >
      <Label htmlFor={inputId}>
        {PT_LABEL}
        <span className="sr-only">, rupees</span>
      </Label>
      <ProfessionalTaxInput
        id={inputId}
        value={notApplicable ? "" : raw}
        disabled={notApplicable}
        onChange={(e) => setRaw(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${inputId}-help`}
      />
      <ProfessionalTaxNotApplicable
        id={`${inputId}-na`}
        checked={notApplicable}
        onCheckedChange={(checked) => {
          setNotApplicable(checked);
          if (checked) setRaw("");
        }}
      />
      <p id={`${inputId}-help`} className="text-xs text-muted-foreground">{PT_HELPER_TEXT}</p>
      {warning && <p className="text-xs text-warning-strong">{warning}</p>}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="min-h-11" disabled={!parsed.success || save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="min-h-11" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
