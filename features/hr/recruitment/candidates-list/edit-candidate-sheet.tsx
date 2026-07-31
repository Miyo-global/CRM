"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useJobPostings } from "@/lib/api/hooks/hr";
import { useUpdateCandidateFull } from "@/lib/api/hooks/hr/candidate-mutations";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Candidate } from "@/types/hr";
import type { CandidateEducationEntry, CandidateSkillEntry } from "@/lib/validations/candidate";

import { HrSheet } from "@/features/hr/hr-sheet";
import {
  CandidateForm,
  emptyCandidateForm,
  type CandidateFormState,
} from "./candidate-form";
import { buildCandidatePayload, validateCandidateForm } from "./candidate-payload";

// The candidates table carries more columns than the shared Candidate type
// currently surfaces; read them defensively for hydration.
export type CandidateWithExtras = Candidate & {
  alternatePhone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  location?: string | null;
  preferredLocation?: string | null;
  requisitionId?: string | null;
  employmentType?: string | null;
  applicationDate?: string | null;
  relevantExperienceMonths?: number | null;
  currentEmploymentStatus?: string | null;
  noticePeriodDays?: number | null;
  availableFrom?: string | null;
  currentCtc?: string | number | null;
  expectedCtc?: string | number | null;
  salaryCurrency?: string | null;
  coverLetterUrl?: string | null;
  workAuthorization?: string | null;
  willingToRelocate?: boolean | null;
  preferredWorkMode?: string | null;
  referralName?: string | null;
  githubUrl?: string | null;
  education?: CandidateEducationEntry[] | null;
  appliedTitle?: string | null;
  appliedDepartment?: string | null;
  skillEntries?: CandidateSkillEntry[] | null;
};

interface EditCandidateSheetProps {
  open: boolean;
  candidate: CandidateWithExtras | null;
  onOpenChange: (open: boolean) => void;
}

function dateString(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function ctcString(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function hydrate(c: CandidateWithExtras): CandidateFormState {
  const base = emptyCandidateForm();
  return {
    ...base,
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    alternatePhone: c.alternatePhone ?? "",
    dateOfBirth: dateString(c.dateOfBirth),
    gender: c.gender ?? "",
    location: c.location ?? "",
    preferredLocation: c.preferredLocation ?? "",
    appliedTitle: c.appliedTitle ?? "",
    appliedDepartment: c.appliedDepartment ?? "",
    skillEntries: Array.isArray(c.skillEntries) ? c.skillEntries : [],
    requisitionId: c.requisitionId ?? "",
    employmentType: c.employmentType ?? "",
    source: c.source ?? "DIRECT",
    applicationDate: dateString(c.applicationDate),
    experienceYears: c.experienceYears != null ? String(c.experienceYears) : "",
    relevantExperienceMonths:
      c.relevantExperienceMonths != null
        ? String(c.relevantExperienceMonths)
        : "",
    currentCompany: c.currentCompany ?? "",
    currentRole: c.currentRole ?? "",
    currentEmploymentStatus: c.currentEmploymentStatus ?? "",
    noticePeriodDays: c.noticePeriodDays != null ? String(c.noticePeriodDays) : "",
    availableFrom: dateString(c.availableFrom),
    education: Array.isArray(c.education) ? c.education : [],

    currentCtc: ctcString(c.currentCtc),
    expectedCtc: ctcString(c.expectedCtc),
    salaryCurrency: c.salaryCurrency ?? "INR",
    resumeUrl: c.resumeUrl ?? "",
    coverLetterUrl: c.coverLetterUrl ?? "",
    portfolioUrl: c.portfolioUrl ?? "",
    linkedinUrl: c.linkedinUrl ?? "",
    githubUrl: c.githubUrl ?? "",
    workAuthorization: c.workAuthorization ?? "",
    willingToRelocate: c.willingToRelocate === true,
    preferredWorkMode: c.preferredWorkMode ?? "",
    referralName: c.referralName ?? "",
    notes: c.notes ?? "",
  };
}

export const EditCandidateSheet = memo(function EditCandidateSheet({
  open,
  candidate,
  onOpenChange,
}: EditCandidateSheetProps) {
  const updateCandidate = useUpdateCandidateFull();
  const { data: jobPostings } = useJobPostings();

  const [form, setForm] = useState<CandidateFormState>(emptyCandidateForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (candidate) setForm(hydrate(candidate));
  }, [candidate]);

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
    if (!candidate) return;
    const result = validateCandidateForm(form);
    if (!result.ok) {
      setErrors(result.errors ?? {});
      toast.error(result.message ?? "Please fix the highlighted fields");
      const firstKey = Object.keys(result.errors ?? {})[0];
      if (firstKey) {
        requestAnimationFrame(() => {
          const baseKey = firstKey.split(".")[0];
          const el =
            document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`) ??
            document.querySelector<HTMLElement>(`[data-field="${baseKey}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      return;
    }
    setErrors({});
    updateCandidate.mutate(
      { id: candidate.id, ...buildCandidatePayload(form) },
      {
        onSuccess: () => {
          toast.success("Candidate updated");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [candidate, form, updateCandidate, onOpenChange]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Candidate"
      description={
        candidate
          ? `Update details for ${candidate.firstName} ${candidate.lastName}`
          : undefined
      }
      onSubmit={handleSubmit}
      submitLabel={updateCandidate.isPending ? "Saving…" : "Save Changes"}
      isPending={updateCandidate.isPending}
    >
      <CandidateForm form={form} setField={setField} jobOptions={jobOptions} errors={errors} />
    </HrSheet>
  );
});
