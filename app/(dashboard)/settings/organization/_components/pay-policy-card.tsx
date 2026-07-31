"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IndianRupee, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

const MAX_SALARY = 100_000_000;

interface PayPolicyCardProps {
  /** Current configured minimum (₹), or null/undefined when unset. */
  minMonthlySalary?: number | null;
}

export function PayPolicyCard({ minMonthlySalary: initialMin }: PayPolicyCardProps) {
  const [minMonthlySalary, setMinMonthlySalary] = useState<string>("");
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!initialized) {
      setMinMonthlySalary(initialMin != null ? String(initialMin) : "");
      setInitialized(true);
    }
  }, [initialized, initialMin]);

  // Local mutation so we don't widen the shared useUpdateOrgSettings body type.
  const { mutate: updatePayPolicy, isPending } = useMutation<
    { success: boolean },
    Error,
    { minMonthlySalary: number | null }
  >({
    mutationFn: (data) => apiClient.patch<{ success: boolean }>("/organization/settings", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.settings() }),
  });

  const handleSave = useCallback(() => {
    const raw = minMonthlySalary.trim();
    let value: number | null = null;
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_SALARY) {
        toast.error("Minimum monthly salary must be a whole number between 0 and 100,000,000");
        return;
      }
      value = parsed > 0 ? parsed : null;
    }
    updatePayPolicy(
      { minMonthlySalary: value },
      {
        onSuccess: () => toast.success("Pay policy saved"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save pay policy"),
      },
    );
  }, [minMonthlySalary, updatePayPolicy]);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-gold" />
          Pay Policy
        </CardTitle>
        <CardDescription>
          Set a minimum monthly salary for employees. New hires and salary edits below this amount
          will be rejected. Leave empty (or 0) to disable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="min-monthly-salary" className="text-sm font-medium">
            Minimum monthly salary (₹)
          </Label>
          <Input
            id="min-monthly-salary"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_SALARY}
            step={1}
            placeholder="e.g. 15000"
            value={minMonthlySalary}
            onChange={(e) => setMinMonthlySalary(e.target.value.replace(/\D/g, ""))}
            className="w-48"
            aria-label="Minimum monthly salary"
          />
          <p className="text-sm text-muted-foreground">
            Applies to the monthly salary captured during onboarding and on the employee profile.
          </p>
        </div>
        <div className="pt-1">
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Pay Policy"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
