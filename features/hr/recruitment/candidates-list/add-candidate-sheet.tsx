"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { useJobPostings } from "@/lib/api/hooks/hr";
import { useCreateCandidateFull } from "@/lib/api/hooks/hr/candidate-mutations";
import { getErrorMessage } from "@/lib/get-error-message";

import { HrSheet } from "@/features/hr/hr-sheet";
import {
  CandidateForm,
  emptyCandidateForm,
  type CandidateFormState,
} from "./candidate-form";
import { buildCandidatePayload, validateCandidateForm } from "./candidate-payload";

function scrollToFirstFieldError(errors: Record<string, string>) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  const baseKey = firstKey.split(".")[0];
  const el =
    document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`) ??
    document.querySelector<HTMLElement>(`[data-field="${baseKey}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

interface AddCandidateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCandidateSheet = memo(function AddCandidateSheet({
  open,
  onOpenChange,
}: AddCandidateSheetProps) {
  const createCandidate = useCreateCandidateFull();
  const { data: jobPostings } = useJobPostings();

  const [form, setForm] = useState<CandidateFormState>(emptyCandidateForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = useCallback(
    <K extends keyof CandidateFormState>(key: K, value: CandidateFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key as string]) return prev;
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    },
    [],
  );

  const jobOptions = useMemo(
    () =>
      (jobPostings ?? []).map((j) => ({
        value: String(j.id),
        label: j.title,
      })),
    [jobPostings],
  );

  const handleSubmit = useCallback(() => {
    const result = validateCandidateForm(form);
    if (!result.ok) {
      setErrors(result.errors ?? {});
      toast.error(result.message ?? "Please fix the highlighted fields");
      requestAnimationFrame(() => scrollToFirstFieldError(result.errors ?? {}));
      return;
    }
    setErrors({});
    createCandidate.mutate(buildCandidatePayload(form), {
      onSuccess: () => {
        toast.success("Candidate added");
        setForm(emptyCandidateForm());
        onOpenChange(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [form, createCandidate, onOpenChange]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add Candidate"
      description="Add a new candidate to the pipeline."
      onSubmit={handleSubmit}
      submitLabel={createCandidate.isPending ? "Adding…" : "Add Candidate"}
      isPending={createCandidate.isPending}
    >
      <CandidateForm form={form} setField={setField} jobOptions={jobOptions} errors={errors} />
    </HrSheet>
  );
});
