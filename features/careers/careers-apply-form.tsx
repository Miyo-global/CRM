"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { CareersHeader } from "@/features/careers/careers-header";
import { CareersFooter } from "@/features/careers/careers-footer";
import { PhoneInput } from "@/components/ui/phone-input";
import type { PhoneValue } from "@/lib/phone";
import {
  RESUME_ALLOWED_EXTENSIONS,
  RESUME_FILE_HINT,
  RESUME_MAX_FILE_SIZE_BYTES,
  validateResumeFileClient,
} from "@/lib/files/resume-file-validation";
import { jobPostingPath } from "@/lib/careers/job-slug";
import { careersApplySchema, mapApplyErrors, CAREERS_APPLY_LIMITS, sanitizePersonNameInput, sanitizeLocationInput, sanitizeJobTitleInput, sanitizeLabelInput, sanitizeSkillInput, parseSkillsList } from "@/lib/careers/apply-validation";
import { resolveFieldVisibility, type ApplicationFieldConfig } from "@/lib/hr/application-field-config";
import { getTodayIST } from "@/lib/careers/application-deadline";
import { sanitizeDecimalString } from "@/lib/numeric-input";
import { cn } from "@/lib/utils";

interface EducationEntry {
  qualification: string;
  institution: string;
  year: string;
}

interface ExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface CustomLinkEntry {
  label: string;
  url: string;
}

interface FormState {
  name: string;
  email: string;
  phone: PhoneValue;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  currentRole: string;
  experienceYears: string;
  coreSkills: string;
  coverLetter: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
  githubUrl: "",
  currentRole: "",
  experienceYears: "",
  coreSkills: "",
  coverLetter: "",
};

const ACCEPT_RESUME = RESUME_ALLOWED_EXTENSIONS.join(",");

const MAX_CORE_SKILLS = CAREERS_APPLY_LIMITS.maxCoreSkills;
const MAX_ADDITIONAL_SKILLS = CAREERS_APPLY_LIMITS.maxAdditionalSkills;
const MAX_CUSTOM_LINKS = CAREERS_APPLY_LIMITS.maxCustomLinks;

const INPUT_BASE =
  "flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1";

function inputClass(invalid?: boolean) {
  return cn(
    INPUT_BASE,
    invalid ? "border-destructive focus-visible:ring-destructive/40" : "border-input focus-visible:ring-ring",
  );
}

function textareaClass(invalid?: boolean) {
  return cn(
    "flex min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 resize-none",
    invalid ? "border-destructive focus-visible:ring-destructive/40" : "border-input focus-visible:ring-ring",
  );
}

const APPLY_FIELD_IDS: Record<string, string> = {
  resume: "resume-section",
  name: "name",
  email: "email",
  phone: "phone",
  location: "location",
  linkedinUrl: "linkedinUrl",
  githubUrl: "githubUrl",
  currentRole: "currentRole",
  experienceYears: "experienceYears",
  coreSkills: "coreSkills",
  coverLetter: "coverLetter",
};

function scrollToFirstApplyError(errors: Record<string, string>) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  const root = firstKey.split(".")[0];
  const id = APPLY_FIELD_IDS[firstKey] ?? APPLY_FIELD_IDS[root] ?? root;
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement) {
    el.focus({ preventScroll: true });
  }
}

type IconProps = { className?: string };

const iconBaseProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": "true" as const,
};

function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg {...iconBaseProps} className={className}>
      <path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function FileTextIcon({ className }: IconProps) {
  return (
    <svg {...iconBaseProps} className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function UploadIcon({ className }: IconProps) {
  return (
    <svg {...iconBaseProps} className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

function XIcon({ className }: IconProps) {
  return (
    <svg {...iconBaseProps} className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg {...iconBaseProps} className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

type CareersApplyFormProps = {
  jobId: number;
  jobTitle: string;
  applicationFields?: ApplicationFieldConfig;
};

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function fieldError(errors: Record<string, string>, key: string): string | undefined {
  return errors[key];
}

function sectionError(errors: Record<string, string>, prefix: string): string | undefined {
  const key = Object.keys(errors).find((k) => k === prefix || k.startsWith(`${prefix}.`));
  return key ? errors[key] : undefined;
}

export function CareersApplyForm({ jobId, jobTitle, applicationFields }: CareersApplyFormProps) {
  const fv = (key: keyof ApplicationFieldConfig) => resolveFieldVisibility(applicationFields, key);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [additionalSkills, setAdditionalSkills] = useState<string[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [customLinks, setCustomLinks] = useState<CustomLinkEntry[]>([]);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [autoFilled, setAutoFilled] = useState(false);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizePersonNameInput(e.target.value);
    setForm((prev) => ({ ...prev, name: cleaned }));
    clearFieldError("name");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\s/g, "").toLowerCase();
    setForm((prev) => ({ ...prev, email: cleaned }));
    clearFieldError("email");
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeLocationInput(e.target.value);
    setForm((prev) => ({ ...prev, location: cleaned }));
    clearFieldError("location");
  };

  const handleCurrentRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeJobTitleInput(e.target.value);
    setForm((prev) => ({ ...prev, currentRole: cleaned }));
    clearFieldError("currentRole");
  };

  const handleCoreSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeSkillInput(e.target.value);
    setForm((prev) => ({ ...prev, coreSkills: cleaned }));
    clearFieldError("coreSkills");
  };

  const handleExperienceYearsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeDecimalString(e.target.value, 4);
    setForm((prev) => ({ ...prev, experienceYears: cleaned }));
    clearFieldError("experienceYears");
  };

  const currentMonth = useMemo(() => getTodayIST().slice(0, 7), []);
  const yearOptions = useMemo(() => {
    const currentYear = Number(getTodayIST().slice(0, 4));
    return Array.from({ length: currentYear - 1959 }, (_, i) => currentYear - i);
  }, []);

  const clearResume = () => {
    setResumeFile(null);
    setAutoFilled(false);
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  const parseAndFill = async (file: File) => {
    setResumeParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post<{
        parsed: {
          name: string | null;
          email: string | null;
          phone: string | null;
          location: string | null;
          linkedinUrl: string | null;
          githubUrl: string | null;
          currentRole: string | null;
          experienceYears: string | null;
          skills: string[];
          education: { qualification: string; institution: string; year: string }[];
          workExperience: {
            company: string;
            title: string;
            startDate: string;
            endDate: string;
            description: string;
          }[];
        } | null;
      }>("/api/careers/apply/parse-resume", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const p = res.data.parsed;
      if (!p) return;

      setForm((prev) => ({
        name: p.name || prev.name,
        email: p.email || prev.email,
        phone: (p.phone as PhoneValue) || prev.phone,
        location: p.location || prev.location,
        linkedinUrl: p.linkedinUrl || prev.linkedinUrl,
        githubUrl: p.githubUrl || prev.githubUrl,
        currentRole: p.currentRole || prev.currentRole,
        experienceYears: p.experienceYears || prev.experienceYears,
        coreSkills: p.skills.length ? p.skills.slice(0, 10).join(", ") : prev.coreSkills,
        coverLetter: prev.coverLetter,
      }));

      if (p.education.length) setEducation(p.education);
      if (p.workExperience.length) setExperience(p.workExperience);

      setAutoFilled(true);
    } catch {
      // silent — user can fill manually
    } finally {
      setResumeParsing(false);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    setAutoFilled(false);
    if (!file) {
      clearResume();
      return;
    }
    const validationError = validateResumeFileClient(file);
    if (validationError) {
      setError(validationError);
      clearResume();
      return;
    }
    setResumeFile(file);
    setFieldErrors((prev) => {
      if (!prev.resume) return prev;
      const next = { ...prev };
      delete next.resume;
      return next;
    });
    void parseAndFill(file);
  };

  const uploadResume = async (): Promise<string | undefined> => {
    if (!resumeFile) return undefined;

    const validationError = validateResumeFileClient(resumeFile);
    if (validationError) {
      throw new Error(validationError);
    }

    const formData = new FormData();
    formData.append("file", resumeFile);
    formData.append("jobPostingId", String(jobId));

    const res = await axios.post<{ url: string; fileName: string }>(
      "/api/careers/apply/upload-resume",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data.url;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const dedupedSkills = parseSkillsList(form.coreSkills, additionalSkills);

    const educationPayload = education
      .filter((e2) => e2.qualification.trim())
      .map((e2) => ({
        qualification: e2.qualification.trim(),
        institution: e2.institution.trim() || undefined,
        year: e2.year.trim() || undefined,
      }));

    const experiencePayload = experience
      .filter((x) => x.company.trim() && x.startDate.trim() && x.endDate.trim())
      .map((x) => ({
        company: x.company.trim(),
        title: x.title.trim() || undefined,
        startDate: x.startDate.trim(),
        endDate: x.endDate.trim(),
        description: x.description.trim() || undefined,
      }));

    const customLinksPayload = customLinks
      .filter((l) => l.label.trim() && l.url.trim())
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));

    const partialEducation = education.some(
      (e2) =>
        (e2.institution.trim() || e2.year.trim()) && !e2.qualification.trim(),
    );
    const partialExperience = experience.some(
      (x) =>
        (x.title.trim() || x.description.trim()) &&
        (!x.company.trim() || !x.startDate.trim() || !x.endDate.trim()),
    );
    const partialLinks = customLinks.some(
      (l) => (l.label.trim() && !l.url.trim()) || (!l.label.trim() && l.url.trim()),
    );

    const years = form.experienceYears.trim();

    const payload = {
      jobPostingId: jobId,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone?.toString().trim() || undefined,
      location: form.location.trim() || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      githubUrl: form.githubUrl.trim() || undefined,
      currentRole: form.currentRole.trim() || undefined,
      experienceYears: years,
      skills: dedupedSkills.length ? dedupedSkills : undefined,
      education: educationPayload.length ? educationPayload : undefined,
      workExperience: experiencePayload.length ? experiencePayload : undefined,
      customLinks: customLinksPayload.length ? customLinksPayload : undefined,
      coverLetter: form.coverLetter.trim() || undefined,
    };

    const validation = careersApplySchema.safeParse(payload);
    const errors: Record<string, string> = validation.success
      ? {}
      : mapApplyErrors(validation.error.issues);
    if (resumeFile) {
      delete errors.resumeUrl;
      delete errors.resume;
    }
    if (!resumeFile) {
      errors.resume = "Please attach your résumé to apply.";
    }
    if (partialEducation) {
      errors.education = "Each education entry needs a qualification.";
    }
    if (partialExperience) {
      errors.workExperience = "Each work entry needs company, start month, and end month (or Present).";
    }
    if (partialLinks) {
      errors.customLinks = "Each custom link needs both a label and a URL.";
    }
    const coreSkillsCount = form.coreSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean).length;
    if (coreSkillsCount > MAX_CORE_SKILLS) {
      errors.coreSkills = `Enter up to ${MAX_CORE_SKILLS} core skills.`;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0] ?? "Please fix the errors in the form.");
      requestAnimationFrame(() => scrollToFirstApplyError(errors));
      return;
    }

    setSubmitting(true);
    try {
      if (!resumeFile) {
        const resumeErrors = { resume: "Please attach your résumé to apply." };
        setFieldErrors(resumeErrors);
        setError(resumeErrors.resume);
        requestAnimationFrame(() => scrollToFirstApplyError(resumeErrors));
        return;
      }

      setResumeUploading(true);
      const resumeUrl = await uploadResume();
      setResumeUploading(false);

      if (!resumeUrl) {
        setError("Failed to upload résumé. Please try again.");
        return;
      }

      const finalValidation = careersApplySchema.safeParse({ ...payload, resumeUrl });
      if (!finalValidation.success) {
        const serverErrors = mapApplyErrors(finalValidation.error.issues);
        setFieldErrors(serverErrors);
        setError(Object.values(serverErrors)[0] ?? "Please fix the errors in the form.");
        requestAnimationFrame(() => scrollToFirstApplyError(serverErrors));
        return;
      }

      await apiClient.post("/careers/apply", finalValidation.data);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? ((err.response?.data as { error?: string })?.error ?? err.message)
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setResumeUploading(false);
      setSubmitting(false);
    }
  };

  const maxMb = Math.floor(RESUME_MAX_FILE_SIZE_BYTES / (1024 * 1024));
  const isBusy = submitting || resumeUploading || resumeParsing;
  const backHref = jobPostingPath(jobId, jobTitle);

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col noir-mesh">
        <CareersHeader backHref={backHref} backLabel="Back to job" />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
          <div className="text-center py-16 rounded-2xl border bg-card/80 shadow-soft px-6">
            <CheckCircleIcon className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Application submitted</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Thank you for applying. We&apos;ll review your profile within 3 working days and reach
              out if there&apos;s a match. A confirmation email is on its way.
            </p>
            <Link
              href="/careers"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Browse other openings
            </Link>
          </div>
        </main>
        <CareersFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col noir-mesh">
      <CareersHeader backHref={backHref} backLabel="Back to job" />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="rounded-2xl border bg-card/90 p-6 sm:p-8 shadow-soft">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Apply for this Position</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {jobTitle} · Fill out the form below to submit your application.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {fv("resume") !== "hidden" && <div
              id="resume-section"
              className={cn(
                "rounded-xl border border-dashed bg-muted/20 p-5 text-center",
                fieldErrors.resume ? "border-destructive ring-1 ring-destructive/30" : "border-input",
              )}
            >
              <UploadIcon className="mx-auto h-7 w-7 text-primary/70" />
              <p className="mt-2 text-sm font-semibold">
                Upload your résumé <span className="text-destructive">*</span>
              </p>
              <input
                ref={resumeInputRef}
                id="resume"
                type="file"
                accept={ACCEPT_RESUME}
                onChange={handleResumeChange}
                className="sr-only"
              />
              {resumeFile ? (
                <div className="mx-auto mt-3 flex max-w-md items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left">
                  <FileTextIcon className="h-4 w-4 text-primary shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {resumeFile.name}
                  </span>
                  {resumeParsing && (
                    <span className="shrink-0 text-[11px] text-muted-foreground animate-pulse">
                      Parsing…
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={clearResume}
                    disabled={isBusy}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Remove résumé"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => resumeInputRef.current?.click()}
                  disabled={isBusy}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40 transition-colors"
                >
                  <FileTextIcon className="h-3.5 w-3.5" />
                  Choose Resume File
                </button>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                {RESUME_FILE_HINT} · max {maxMb}MB
              </p>
              {fieldErrors.resume && (
                <p className="mt-2 text-xs text-destructive">{fieldErrors.resume}</p>
              )}
            </div>}

            {autoFilled && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
                Fields auto-filled from your résumé — review and edit before submitting.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="name" required>
                  Full Name
                </FieldLabel>
                <input
                  id="name"
                  type="text"
                  inputMode="text"
                  value={form.name}
                  onChange={handleNameChange}
                  required
                  maxLength={CAREERS_APPLY_LIMITS.nameMax}
                  aria-invalid={!!fieldErrors.name}
                  placeholder="Enter your full name"
                  className={inputClass(!!fieldErrors.name)}
                />
                <FieldError message={fieldErrors.name} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="email" required>
                  Email Address
                </FieldLabel>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={handleEmailChange}
                  required
                  aria-invalid={!!fieldErrors.email}
                  placeholder="Enter your email address"
                  className={inputClass(!!fieldErrors.email)}
                />
                <FieldError message={fieldErrors.email} />
              </div>
              {fv("phone") !== "hidden" && <div className="space-y-1.5">
                <FieldLabel htmlFor="phone" required={fv("phone") === "required"}>Phone Number</FieldLabel>
                <PhoneInput
                  id="phone"
                  value={form.phone}
                  aria-invalid={!!fieldErrors.phone}
                  className={inputClass(!!fieldErrors.phone)}
                  onChange={(value) => {
                    setForm((prev) => ({ ...prev, phone: value ?? "" }));
                    clearFieldError("phone");
                  }}
                />
                <FieldError message={fieldErrors.phone} />
              </div>}
              {fv("location") !== "hidden" && <div className="space-y-1.5">
                <FieldLabel htmlFor="location" required={fv("location") === "required"}>Location</FieldLabel>
                <input
                  id="location"
                  type="text"
                  value={form.location}
                  onChange={handleLocationChange}
                  maxLength={CAREERS_APPLY_LIMITS.locationMax}
                  aria-invalid={!!fieldErrors.location}
                  placeholder="City, Country"
                  className={inputClass(!!fieldErrors.location)}
                />
                <FieldError message={fieldErrors.location} />
              </div>}
              {fv("linkedinUrl") !== "hidden" && <div className="space-y-1.5">
                <FieldLabel htmlFor="linkedinUrl" required={fv("linkedinUrl") === "required"}>LinkedIn Profile URL</FieldLabel>
                <input
                  id="linkedinUrl"
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, linkedinUrl: e.target.value.trim() }));
                    clearFieldError("linkedinUrl");
                  }}
                  maxLength={CAREERS_APPLY_LIMITS.urlMax}
                  aria-invalid={!!fieldErrors.linkedinUrl}
                  placeholder="https://linkedin.com/in/your-profile"
                  className={inputClass(!!fieldErrors.linkedinUrl)}
                />
                <FieldError message={fieldErrors.linkedinUrl} />
              </div>}
              {fv("githubUrl") !== "hidden" && <div className="space-y-1.5">
                <FieldLabel htmlFor="githubUrl" required={fv("githubUrl") === "required"}>GitHub Profile URL</FieldLabel>
                <input
                  id="githubUrl"
                  type="url"
                  value={form.githubUrl}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, githubUrl: e.target.value.trim() }));
                    clearFieldError("githubUrl");
                  }}
                  maxLength={CAREERS_APPLY_LIMITS.urlMax}
                  aria-invalid={!!fieldErrors.githubUrl}
                  placeholder="https://github.com/yourusername"
                  className={inputClass(!!fieldErrors.githubUrl)}
                />
                <FieldError message={fieldErrors.githubUrl} />
              </div>}
              {fv("currentRole") !== "hidden" && <div className="space-y-1.5">
                <FieldLabel htmlFor="currentRole" required={fv("currentRole") === "required"}>Current Job Title</FieldLabel>
                <input
                  id="currentRole"
                  type="text"
                  value={form.currentRole}
                  onChange={handleCurrentRoleChange}
                  maxLength={CAREERS_APPLY_LIMITS.currentRoleMax}
                  aria-invalid={!!fieldErrors.currentRole}
                  placeholder="Enter your current job title"
                  className={inputClass(!!fieldErrors.currentRole)}
                />
                <FieldError message={fieldErrors.currentRole} />
              </div>}
              {fv("experienceYears") !== "hidden" && <div className="space-y-1.5">
                <FieldLabel htmlFor="experienceYears" required={fv("experienceYears") === "required"}>Total Years of Experience</FieldLabel>
                <input
                  id="experienceYears"
                  type="text"
                  inputMode="decimal"
                  value={form.experienceYears}
                  onChange={handleExperienceYearsChange}
                  aria-invalid={!!fieldErrors.experienceYears}
                  placeholder="e.g., 3 or 3.5"
                  maxLength={5}
                  className={inputClass(!!fieldErrors.experienceYears)}
                />
                <FieldError message={fieldErrors.experienceYears} />
              </div>}
            </div>

            {fv("education") !== "hidden" && <section className="space-y-3">
              <h2 className="text-sm font-semibold">Education Qualification{fv("education") === "required" && <span className="text-destructive"> *</span>}</h2>
              <FieldError message={sectionError(fieldErrors, "education")} />
              {education.map((entry, i) => (
                <div key={i} className="rounded-lg border border-input bg-muted/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Education {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEducation((prev) => prev.filter((_, idx) => idx !== i))}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      aria-label="Remove education"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={entry.qualification}
                    maxLength={200}
                    aria-invalid={!!fieldError(fieldErrors, `education.${i}.qualification`)}
                    onChange={(e) => {
                      const qualification = sanitizeLabelInput(e.target.value);
                      setEducation((prev) =>
                        prev.map((row, idx) =>
                          idx === i ? { ...row, qualification } : row,
                        ),
                      );
                      clearFieldError(`education.${i}.qualification`);
                    }}
                    placeholder="Degree / Qualification"
                    className={inputClass(!!fieldError(fieldErrors, `education.${i}.qualification`))}
                  />
                  <FieldError message={fieldError(fieldErrors, `education.${i}.qualification`)} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={entry.institution}
                        maxLength={200}
                        aria-invalid={!!fieldError(fieldErrors, `education.${i}.institution`)}
                        onChange={(e) => {
                          const institution = sanitizeLabelInput(e.target.value);
                          setEducation((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, institution } : row,
                            ),
                          );
                          clearFieldError(`education.${i}.institution`);
                        }}
                        placeholder="Institution"
                        className={inputClass(!!fieldError(fieldErrors, `education.${i}.institution`))}
                      />
                      <FieldError message={fieldError(fieldErrors, `education.${i}.institution`)} />
                    </div>
                    <select
                      value={entry.year}
                      onChange={(e) =>
                        setEducation((prev) =>
                          prev.map((row, idx) =>
                            idx === i ? { ...row, year: e.target.value } : row,
                          ),
                        )
                      }
                      aria-label="Year of completion"
                      className={inputClass(false)}
                    >
                      <option value="">Year</option>
                      {yearOptions.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setEducation((prev) => [...prev, { qualification: "", institution: "", year: "" }])
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Education
              </button>
            </section>}

            {fv("workExperience") !== "hidden" && <section className="space-y-3">
              <h2 className="text-sm font-semibold">Work Experience{fv("workExperience") === "required" && <span className="text-destructive"> *</span>}</h2>
              <FieldError message={sectionError(fieldErrors, "workExperience")} />
              {experience.map((entry, i) => (
                <div key={i} className="rounded-lg border border-input bg-muted/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Experience {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExperience((prev) => prev.filter((_, idx) => idx !== i))}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      aria-label="Remove experience"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={entry.company}
                      maxLength={200}
                      aria-invalid={!!fieldError(fieldErrors, `workExperience.${i}.company`)}
                      onChange={(e) => {
                        const company = sanitizeLabelInput(e.target.value);
                        setExperience((prev) =>
                          prev.map((row, idx) =>
                            idx === i ? { ...row, company } : row,
                          ),
                        );
                        clearFieldError(`workExperience.${i}.company`);
                      }}
                      placeholder="Company"
                      className={inputClass(!!fieldError(fieldErrors, `workExperience.${i}.company`))}
                    />
                    <FieldError message={fieldError(fieldErrors, `workExperience.${i}.company`)} />
                    <input
                      type="text"
                      value={entry.title}
                      maxLength={200}
                      aria-invalid={!!fieldError(fieldErrors, `workExperience.${i}.title`)}
                      onChange={(e) => {
                        const title = sanitizeJobTitleInput(e.target.value);
                        setExperience((prev) =>
                          prev.map((row, idx) =>
                            idx === i ? { ...row, title } : row,
                          ),
                        );
                        clearFieldError(`workExperience.${i}.title`);
                      }}
                      placeholder="Title"
                      className={inputClass(!!fieldError(fieldErrors, `workExperience.${i}.title`))}
                    />
                    <FieldError message={fieldError(fieldErrors, `workExperience.${i}.title`)} />
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Start</span>
                      <input
                        type="month"
                        max={currentMonth}
                        value={entry.startDate}
                        onChange={(e) => {
                          setExperience((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, startDate: e.target.value } : row,
                            ),
                          );
                          clearFieldError(`workExperience.${i}.startDate`);
                        }}
                        aria-label="Start month"
                        aria-invalid={!!fieldError(fieldErrors, `workExperience.${i}.startDate`)}
                        className={inputClass(!!fieldError(fieldErrors, `workExperience.${i}.startDate`))}
                      />
                      <FieldError message={fieldError(fieldErrors, `workExperience.${i}.startDate`)} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">End</span>
                      <input
                        type="month"
                        min={entry.startDate || undefined}
                        max={currentMonth}
                        value={entry.endDate === "Present" ? "" : entry.endDate}
                        disabled={entry.endDate === "Present"}
                        onChange={(e) => {
                          setExperience((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, endDate: e.target.value } : row,
                            ),
                          );
                          clearFieldError(`workExperience.${i}.endDate`);
                        }}
                        aria-label="End month"
                        aria-invalid={!!fieldError(fieldErrors, `workExperience.${i}.endDate`)}
                        className={cn(inputClass(!!fieldError(fieldErrors, `workExperience.${i}.endDate`)), "disabled:opacity-50")}
                      />
                      <FieldError message={fieldError(fieldErrors, `workExperience.${i}.endDate`)} />
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={entry.endDate === "Present"}
                          onChange={(e) =>
                            setExperience((prev) =>
                              prev.map((row, idx) =>
                                idx === i
                                  ? { ...row, endDate: e.target.checked ? "Present" : "" }
                                  : row,
                              ),
                            )
                          }
                        />
                        I currently work here
                      </label>
                    </div>
                  </div>
                  <textarea
                    value={entry.description}
                    maxLength={CAREERS_APPLY_LIMITS.workDescriptionMax}
                    onChange={(e) =>
                      setExperience((prev) =>
                        prev.map((row, idx) =>
                          idx === i ? { ...row, description: e.target.value } : row,
                        ),
                      )
                    }
                    rows={2}
                    placeholder="What did you work on?"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setExperience((prev) => [
                    ...prev,
                    { company: "", title: "", startDate: "", endDate: "", description: "" },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Experience
              </button>
            </section>}

            {(fv("coreSkills") !== "hidden" || fv("additionalSkills") !== "hidden") && <section className="space-y-3">
              {fv("coreSkills") !== "hidden" && <>
              <FieldLabel htmlFor="coreSkills" required={fv("coreSkills") === "required"}>Core Skills</FieldLabel>
              <input
                id="coreSkills"
                type="text"
                value={form.coreSkills}
                onChange={handleCoreSkillsChange}
                maxLength={500}
                aria-invalid={!!fieldErrors.coreSkills}
                placeholder="Enter skills (e.g., SQL, Python)"
                className={inputClass(!!fieldErrors.coreSkills)}
              />
              <p className="text-xs text-muted-foreground">
                Separate skills with commas (up to {MAX_CORE_SKILLS}).
              </p>
              <FieldError message={fieldErrors.coreSkills} />
              </>}

              {fv("additionalSkills") !== "hidden" && <><h3 className="pt-2 text-sm font-semibold">Additional Skills{fv("additionalSkills") === "required" && <span className="text-destructive"> *</span>}</h3>
              {additionalSkills.map((skill, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => {
                      const next = sanitizeSkillInput(e.target.value);
                      setAdditionalSkills((prev) =>
                        prev.map((s, idx) => (idx === i ? next : s)),
                      );
                      clearFieldError(`skills.${i}`);
                    }}
                    maxLength={CAREERS_APPLY_LIMITS.skillItemMax}
                    aria-invalid={!!fieldError(fieldErrors, `skills.${i + form.coreSkills.split(",").filter(Boolean).length}`)}
                    placeholder="Skill"
                    className={inputClass(!!fieldError(fieldErrors, `skills.${i + form.coreSkills.split(",").filter(Boolean).length}`))}
                  />
                  <button
                    type="button"
                    onClick={() => setAdditionalSkills((prev) => prev.filter((_, idx) => idx !== i))}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Remove skill"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={additionalSkills.length >= MAX_ADDITIONAL_SKILLS}
                onClick={() => setAdditionalSkills((prev) => [...prev, ""])}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-input disabled:hover:text-muted-foreground"
              >
                <PlusIcon className="h-4 w-4" />
                Additional Skill
              </button>
              </>}
            </section>}

            {fv("customLinks") !== "hidden" && <section className="space-y-3">
              <h2 className="text-sm font-semibold">Portfolio / Custom Links{fv("customLinks") === "required" && <span className="text-destructive"> *</span>}</h2>
              <FieldError message={sectionError(fieldErrors, "customLinks")} />
              {customLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const label = sanitizeLabelInput(e.target.value);
                      setCustomLinks((prev) =>
                        prev.map((row, idx) => (idx === i ? { ...row, label } : row)),
                      );
                      clearFieldError(`customLinks.${i}.label`);
                    }}
                    maxLength={100}
                    aria-invalid={!!fieldError(fieldErrors, `customLinks.${i}.label`)}
                    placeholder="Label (e.g., Portfolio)"
                    className={cn(inputClass(!!fieldError(fieldErrors, `customLinks.${i}.label`)), "sm:max-w-[40%]")}
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => {
                      setCustomLinks((prev) =>
                        prev.map((row, idx) => (idx === i ? { ...row, url: e.target.value.trim() } : row)),
                      );
                      clearFieldError(`customLinks.${i}.url`);
                    }}
                    maxLength={CAREERS_APPLY_LIMITS.urlMax}
                    aria-invalid={!!fieldError(fieldErrors, `customLinks.${i}.url`)}
                    placeholder="https://…"
                    className={inputClass(!!fieldError(fieldErrors, `customLinks.${i}.url`))}
                  />
                  <button
                    type="button"
                    onClick={() => setCustomLinks((prev) => prev.filter((_, idx) => idx !== i))}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Remove link"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={customLinks.length >= MAX_CUSTOM_LINKS}
                onClick={() => setCustomLinks((prev) => [...prev, { label: "", url: "" }])}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-input disabled:hover:text-muted-foreground"
              >
                <PlusIcon className="h-4 w-4" />
                Add Custom Link
              </button>
            </section>}

            {fv("coverLetter") !== "hidden" && <div className="space-y-1.5">
              <FieldLabel htmlFor="coverLetter" required={fv("coverLetter") === "required"}>Cover Letter</FieldLabel>
              <textarea
                id="coverLetter"
                value={form.coverLetter}
                onChange={set("coverLetter")}
                maxLength={CAREERS_APPLY_LIMITS.coverLetterMax}
                aria-invalid={!!fieldErrors.coverLetter}
                rows={4}
                placeholder="Tell us why you'd be a great fit… (optional)"
                className={textareaClass(!!fieldErrors.coverLetter)}
              />
              <FieldError message={fieldErrors.coverLetter} />
            </div>}

            {error && (
              <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href={backHref}
                className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted/50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isBusy}
                className="press-scale inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CheckCircleIcon className="h-4 w-4" />
                {resumeParsing
                  ? "Reading résumé…"
                  : resumeUploading
                    ? "Uploading résumé…"
                    : submitting
                      ? "Submitting…"
                      : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <CareersFooter />
    </div>
  );
}
