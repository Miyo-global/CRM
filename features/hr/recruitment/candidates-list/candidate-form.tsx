"use client";

import { memo, useCallback, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/phone-input";
import type { PhoneValue } from "@/lib/phone";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FileUpload } from "@/components/storage/file-upload";
import { cn } from "@/lib/utils";
import {
  CANDIDATE_SOURCE_OPTIONS,
  GENDER_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  WORK_MODE_OPTIONS,
  WORK_AUTHORIZATION_OPTIONS,
  SALARY_CURRENCY_OPTIONS,
  SKILL_TYPE_OPTIONS,
  SKILL_PROFICIENCY_OPTIONS,
  sanitizePersonNameInput,
  sanitizeLocationInput,
  sanitizeJobTitleInput,
  sanitizeRequisitionInput,
  CANDIDATE_FORM_LIMITS,
  type CandidateEducationEntry,
  type CandidateSkillEntry,
} from "@/lib/validations/candidate";

export interface CandidateFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: PhoneValue;
  alternatePhone: PhoneValue;
  dateOfBirth: string;
  gender: string;
  location: string;
  preferredLocation: string;

  appliedTitle: string;
  appliedDepartment: string;
  jobPostingId: string;
  requisitionId: string;
  employmentType: string;
  source: string;
  applicationDate: string;

  experienceYears: string;
  relevantExperienceMonths: string;
  currentCompany: string;
  currentRole: string;
  currentEmploymentStatus: string;
  noticePeriodDays: string;
  availableFrom: string;

  education: CandidateEducationEntry[];
  skillEntries: CandidateSkillEntry[];

  currentCtc: string;
  expectedCtc: string;
  salaryCurrency: string;

  resumeUrl: string;
  coverLetterUrl: string;
  portfolioUrl: string;
  linkedinUrl: string;
  githubUrl: string;

  workAuthorization: string;
  willingToRelocate: boolean;
  preferredWorkMode: string;
  referralName: string;
  notes: string;
}

export function emptyCandidateForm(): CandidateFormState {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    alternatePhone: "",
    dateOfBirth: "",
    gender: "",
    location: "",
    preferredLocation: "",
    appliedTitle: "",
    appliedDepartment: "",
    jobPostingId: "",
    requisitionId: "",
    employmentType: "",
    source: "DIRECT",
    applicationDate: "",
    experienceYears: "",
    relevantExperienceMonths: "",
    currentCompany: "",
    currentRole: "",
    currentEmploymentStatus: "",
    noticePeriodDays: "",
    availableFrom: "",
    education: [{ qualification: "", specialization: "", institution: "", year: "" }],
    skillEntries: [],
    currentCtc: "",
    expectedCtc: "",
    salaryCurrency: "INR",
    resumeUrl: "",
    coverLetterUrl: "",
    portfolioUrl: "",
    linkedinUrl: "",
    githubUrl: "",
    workAuthorization: "",
    willingToRelocate: false,
    preferredWorkMode: "",
    referralName: "",
    notes: "",
  };
}

export interface CandidateJobOption {
  value: string;
  label: string;
}

type Setter = <K extends keyof CandidateFormState>(
  key: K,
  value: CandidateFormState[K],
) => void;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  fieldKey,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  fieldKey?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5" data-field={fieldKey}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

function inputClass(invalid: boolean) {
  return cn(
    invalid
      ? "border-destructive focus-visible:ring-destructive/40"
      : "border-input focus-visible:ring-ring",
  );
}

const SKILL_TYPE_COLOR: Record<string, string> = {
  PRIMARY: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  SECONDARY: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  TECHNICAL: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  SOFT: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

const SKILL_TYPE_LABEL: Record<string, string> = {
  PRIMARY: "Primary",
  SECONDARY: "Secondary",
  TECHNICAL: "Technical",
  SOFT: "Soft",
};

function SkillsInput({
  value,
  onChange,
}: {
  value: CandidateSkillEntry[];
  onChange: (next: CandidateSkillEntry[]) => void;
}) {
  const [name, setName] = useState("");
  const [skillType, setSkillType] = useState("PRIMARY");
  const [proficiency, setProficiency] = useState("INTERMEDIATE");

  const handleAdd = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, { name: trimmed, skillType: skillType as CandidateSkillEntry["skillType"], proficiency: proficiency as CandidateSkillEntry["proficiency"] }]);
    setName("");
  }, [name, skillType, proficiency, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const remove = useCallback(
    (skillName: string) => onChange(value.filter((s) => s.name !== skillName)),
    [value, onChange],
  );

  const grouped = SKILL_TYPE_OPTIONS.map((opt) => ({
    type: opt.value,
    label: opt.label,
    skills: value.filter((s) => s.skillType === opt.value),
  })).filter((g) => g.skills.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={name}
          placeholder="Skill name (e.g. React, Leadership)"
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <SearchableSelect
          options={SKILL_TYPE_OPTIONS}
          value={skillType}
          onValueChange={setSkillType}
          placeholder="Type"
          className="w-32"
        />
        <SearchableSelect
          options={SKILL_PROFICIENCY_OPTIONS}
          value={proficiency}
          onValueChange={setProficiency}
          placeholder="Level"
          className="w-36"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          Add
        </Button>
      </div>
      {grouped.length > 0 && (
        <div className="space-y-2">
          {grouped.map((g) => (
            <div key={g.type}>
              <p className="mb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{g.label} Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {g.skills.map((s) => (
                  <span
                    key={s.name}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${SKILL_TYPE_COLOR[s.skillType] ?? ""}`}
                  >
                    {s.name}
                    {s.proficiency && (
                      <span className="opacity-60">· {s.proficiency.charAt(0) + s.proficiency.slice(1).toLowerCase()}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(s.name)}
                      aria-label={`Remove ${s.name}`}
                      className="ml-0.5 opacity-70 hover:opacity-100"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {value.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Type a skill, choose its type (Primary/Secondary/Technical/Soft) and proficiency level, then press Enter or click Add.
        </p>
      )}
    </div>
  );
}

function EducationInput({
  value,
  onChange,
  errors,
}: {
  value: CandidateEducationEntry[];
  onChange: (next: CandidateEducationEntry[]) => void;
  errors?: Record<string, string>;
}) {
  const update = useCallback(
    (index: number, patch: Partial<CandidateEducationEntry>) => {
      onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    },
    [value, onChange],
  );

  const add = useCallback(
    () => onChange([...value, { qualification: "", specialization: "", institution: "", year: "" }]),
    [value, onChange],
  );

  const remove = useCallback(
    (index: number) => onChange(value.filter((_, i) => i !== index)),
    [value, onChange],
  );

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div
          key={i}
          className="space-y-2 rounded-md border border-border/60 p-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Qualification {i + 1}
              {i === 0 && <span className="text-destructive"> *</span>}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove qualification"
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
            <Input
              value={row.qualification}
              placeholder="Degree / Qualification (e.g. B.Tech)"
              className={inputClass(!!errors?.[`education.${i}.qualification`] || (i === 0 && !!errors?.["education.0.qualification"]))}
              onChange={(e) => update(i, { qualification: e.target.value })}
            />
            {(errors?.[`education.${i}.qualification`] || (i === 0 && errors?.["education.0.qualification"])) && (
              <p className="mt-1 text-[11px] text-destructive">
                {errors[`education.${i}.qualification`] ?? errors["education.0.qualification"]}
              </p>
            )}
            </div>
            <Input
              value={row.specialization ?? ""}
              placeholder="Specialization (e.g. Computer Science)"
              onChange={(e) => update(i, { specialization: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={row.institution ?? ""}
              placeholder="University / Institution"
              onChange={(e) => update(i, { institution: e.target.value })}
            />
            <Input
              value={row.year ?? ""}
              placeholder="Graduation Year (e.g. 2021)"
              onChange={(e) => update(i, { year: e.target.value })}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={add}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add qualification
      </Button>
    </div>
  );
}

function UploadField({
  label,
  required,
  url,
  folder,
  onChange,
  error,
  fieldKey,
}: {
  label: string;
  required?: boolean;
  url: string;
  folder: string;
  onChange: (url: string) => void;
  error?: string;
  fieldKey?: string;
}) {
  return (
    <Field label={label} required={required} error={error} fieldKey={fieldKey}>
      <FileUpload
        folder={folder}
        accept=".pdf,.doc,.docx"
        onUploadComplete={(uploadedUrl) => onChange(uploadedUrl)}
      />
      {url && (
        <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-1.5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-primary hover:underline"
          >
            {url}
          </a>
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Remove ${label}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </Field>
  );
}

interface CandidateFormProps {
  form: CandidateFormState;
  setField: Setter;
  jobOptions: CandidateJobOption[];
  errors?: Record<string, string>;
}

export const CandidateForm = memo(function CandidateForm({
  form,
  setField,
  jobOptions,
  errors = {},
}: CandidateFormProps) {
  const err = (key: string) => errors[key];
  return (
    <div className="space-y-6">
      {/* ── Basic Information ── */}
      <Section title="Basic Information">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" required error={err("firstName")} fieldKey="firstName">
            <Input
              value={form.firstName}
              maxLength={50}
              aria-invalid={!!err("firstName")}
              className={inputClass(!!err("firstName"))}
              onChange={(e) => setField("firstName", sanitizePersonNameInput(e.target.value))}
            />
          </Field>
          <Field label="Last Name" required error={err("lastName")} fieldKey="lastName">
            <Input
              value={form.lastName}
              maxLength={50}
              aria-invalid={!!err("lastName")}
              className={inputClass(!!err("lastName"))}
              onChange={(e) => setField("lastName", sanitizePersonNameInput(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Email Address" required error={err("email")} fieldKey="email">
          <Input
            type="email"
            value={form.email}
            maxLength={254}
            aria-invalid={!!err("email")}
            className={inputClass(!!err("email"))}
            onChange={(e) => setField("email", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone Number" required error={err("phone")} fieldKey="phone">
            <PhoneInput
              value={form.phone}
              onChange={(v) => setField("phone", v ?? "")}
              className={inputClass(!!err("phone"))}
            />
          </Field>
          <Field label="Alternate Phone" error={err("alternatePhone")} fieldKey="alternatePhone">
            <PhoneInput
              value={form.alternatePhone}
              onChange={(v) => setField("alternatePhone", v ?? "")}
              className={inputClass(!!err("alternatePhone"))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth" error={err("dateOfBirth")} fieldKey="dateOfBirth">
            <DatePicker
              value={form.dateOfBirth}
              onChange={(v) => setField("dateOfBirth", v)}
              toYear={new Date().getFullYear() - CANDIDATE_FORM_LIMITS.minAge}
            />
          </Field>
          <Field label="Gender" error={err("gender")} fieldKey="gender">
            <SearchableSelect
              options={GENDER_OPTIONS}
              value={form.gender}
              onValueChange={(v) => setField("gender", v)}
              placeholder="Select gender"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current Location" required error={err("location")} fieldKey="location">
            <Input
              value={form.location}
              placeholder="e.g. Bengaluru, India"
              maxLength={120}
              aria-invalid={!!err("location")}
              className={inputClass(!!err("location"))}
              onChange={(e) => setField("location", sanitizeLocationInput(e.target.value))}
            />
          </Field>
          <Field label="Preferred Location" error={err("preferredLocation")} fieldKey="preferredLocation">
            <Input
              value={form.preferredLocation}
              placeholder="e.g. Remote / Hyderabad"
              maxLength={120}
              className={inputClass(!!err("preferredLocation"))}
              onChange={(e) => setField("preferredLocation", sanitizeLocationInput(e.target.value))}
            />
          </Field>
        </div>
      </Section>

      {/* ── Job Application Details ── */}
      <Section title="Job Application Details">
        <Field label="Applied Job Title / Position" required error={err("appliedTitle")} fieldKey="appliedTitle">
          <Input
            value={form.appliedTitle}
            placeholder="e.g. Senior Frontend Engineer"
            maxLength={150}
            className={inputClass(!!err("appliedTitle"))}
            onChange={(e) => setField("appliedTitle", sanitizeJobTitleInput(e.target.value))}
          />
        </Field>
        <Field label="Department" error={err("appliedDepartment")} fieldKey="appliedDepartment">
          <Input
            value={form.appliedDepartment}
            placeholder="e.g. Engineering, Product, Sales"
            maxLength={120}
            onChange={(e) => setField("appliedDepartment", e.target.value)}
          />
        </Field>
        {jobOptions.length > 0 && (
          <Field label="Link to Job Opening" fieldKey="jobPostingId">
            <SearchableSelect
              options={jobOptions}
              value={form.jobPostingId}
              onValueChange={(v) => setField("jobPostingId", v)}
              placeholder="Select an open requisition"
              searchPlaceholder="Search openings…"
            />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Job Requisition ID" error={err("requisitionId")} fieldKey="requisitionId">
            <Input
              value={form.requisitionId}
              placeholder="e.g. REQ-2026-014"
              maxLength={50}
              className={inputClass(!!err("requisitionId"))}
              onChange={(e) => setField("requisitionId", sanitizeRequisitionInput(e.target.value))}
            />
          </Field>
          <Field label="Employment Type" required error={err("employmentType")} fieldKey="employmentType">
            <SearchableSelect
              options={EMPLOYMENT_TYPE_OPTIONS}
              value={form.employmentType}
              onValueChange={(v) => setField("employmentType", v)}
              placeholder="Select type"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source of Application" required error={err("source")} fieldKey="source">
            <SearchableSelect
              options={CANDIDATE_SOURCE_OPTIONS}
              value={form.source}
              onValueChange={(v) => setField("source", v)}
              placeholder="Select source"
            />
          </Field>
          <Field label="Application Date" error={err("applicationDate")} fieldKey="applicationDate">
            <DatePicker
              value={form.applicationDate}
              onChange={(v) => setField("applicationDate", v)}
            />
          </Field>
        </div>
        {form.source === "REFERRAL" && (
          <Field label="Referral Employee Name" required error={err("referralName")} fieldKey="referralName">
            <Input
              value={form.referralName}
              placeholder="Who referred this candidate?"
              maxLength={120}
              className={inputClass(!!err("referralName"))}
              onChange={(e) => setField("referralName", sanitizePersonNameInput(e.target.value))}
            />
          </Field>
        )}
      </Section>

      {/* ── Professional Information ── */}
      <Section title="Professional Information">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total Experience (years)" required error={err("experienceYears")} fieldKey="experienceYears">
            <Input
              type="number"
              min={0}
              max={60}
              step={0.5}
              value={form.experienceYears}
              placeholder="e.g. 5"
              className={inputClass(!!err("experienceYears"))}
              onChange={(e) => setField("experienceYears", e.target.value)}
            />
          </Field>
          <Field label="Relevant Experience (months)" error={err("relevantExperienceMonths")} fieldKey="relevantExperienceMonths">
            <Input
              type="number"
              min={0}
              max={720}
              value={form.relevantExperienceMonths}
              placeholder="e.g. 36"
              className={inputClass(!!err("relevantExperienceMonths"))}
              onChange={(e) => setField("relevantExperienceMonths", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current Company" error={err("currentCompany")} fieldKey="currentCompany">
            <Input
              value={form.currentCompany}
              placeholder="e.g. Acme Corp"
              maxLength={200}
              className={inputClass(!!err("currentCompany"))}
              onChange={(e) => setField("currentCompany", e.target.value)}
            />
          </Field>
          <Field label="Current Designation" error={err("currentRole")} fieldKey="currentRole">
            <Input
              value={form.currentRole}
              placeholder="e.g. Software Engineer"
              maxLength={200}
              onChange={(e) => setField("currentRole", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current Employment Status" fieldKey="currentEmploymentStatus">
            <SearchableSelect
              options={EMPLOYMENT_STATUS_OPTIONS}
              value={form.currentEmploymentStatus}
              onValueChange={(v) => setField("currentEmploymentStatus", v)}
              placeholder="Select status"
            />
          </Field>
          <Field label="Notice Period (days)" required error={err("noticePeriodDays")} fieldKey="noticePeriodDays">
            <Input
              type="number"
              min={0}
              max={365}
              value={form.noticePeriodDays}
              placeholder="e.g. 60"
              className={inputClass(!!err("noticePeriodDays"))}
              onChange={(e) => setField("noticePeriodDays", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Available From Date" error={err("availableFrom")} fieldKey="availableFrom">
          <DatePicker
            value={form.availableFrom}
            onChange={(v) => setField("availableFrom", v)}
          />
        </Field>
      </Section>

      {/* ── Education / Qualifications ── */}
      <Section
        title="Education / Qualifications"
        description="Add qualifications highest first. Each entry captures degree, specialization, institution, and year."
      >
        <EducationInput
          value={form.education}
          onChange={(v) => setField("education", v)}
          errors={errors}
        />
        {err("education") && (
          <p className="text-[11px] text-destructive">{err("education")}</p>
        )}
      </Section>

      {/* ── Skills & Competencies ── */}
      <Section
        title="Skills & Competencies"
        description="Add skills with their category (Primary, Secondary, Technical, Soft) and proficiency level."
      >
        <SkillsInput
          value={form.skillEntries}
          onChange={(v) => setField("skillEntries", v)}
        />
        {err("skillEntries") && (
          <p className="text-[11px] text-destructive">{err("skillEntries")}</p>
        )}
      </Section>

      {/* ── Compensation Details ── */}
      <Section title="Compensation Details">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Salary Currency">
            <SearchableSelect
              options={SALARY_CURRENCY_OPTIONS}
              value={form.salaryCurrency}
              onValueChange={(v) => setField("salaryCurrency", v)}
              placeholder="Currency"
            />
          </Field>
          <Field label="Current CTC" required error={err("currentCtc")} fieldKey="currentCtc">
            <Input
              type="number"
              min={0}
              value={form.currentCtc}
              placeholder="e.g. 1800000"
              className={inputClass(!!err("currentCtc"))}
              onChange={(e) => setField("currentCtc", e.target.value)}
            />
          </Field>
          <Field label="Expected CTC" required error={err("expectedCtc")} fieldKey="expectedCtc">
            <Input
              type="number"
              min={0}
              value={form.expectedCtc}
              placeholder="e.g. 2400000"
              className={inputClass(!!err("expectedCtc"))}
              onChange={(e) => setField("expectedCtc", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* ── Resume & Documents ── */}
      <Section title="Resume & Documents">
        <UploadField
          label="Resume / CV"
          required
          url={form.resumeUrl}
          folder="candidates/resumes"
          onChange={(v) => setField("resumeUrl", v)}
          error={err("resumeUrl")}
          fieldKey="resumeUrl"
        />
        <UploadField
          label="Cover Letter"
          url={form.coverLetterUrl}
          folder="candidates/cover-letters"
          onChange={(v) => setField("coverLetterUrl", v)}
        />
        <Field label="Portfolio URL" error={err("portfolioUrl")} fieldKey="portfolioUrl">
          <Input
            value={form.portfolioUrl}
            placeholder="https://…"
            className={inputClass(!!err("portfolioUrl"))}
            onChange={(e) => setField("portfolioUrl", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="LinkedIn Profile URL" error={err("linkedinUrl")} fieldKey="linkedinUrl">
            <Input
              value={form.linkedinUrl}
              placeholder="https://linkedin.com/in/…"
              className={inputClass(!!err("linkedinUrl"))}
              onChange={(e) => setField("linkedinUrl", e.target.value)}
            />
          </Field>
          <Field label="GitHub / Personal Website" error={err("githubUrl")} fieldKey="githubUrl">
            <Input
              value={form.githubUrl}
              placeholder="https://github.com/…"
              className={inputClass(!!err("githubUrl"))}
              onChange={(e) => setField("githubUrl", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* ── Additional Details ── */}
      <Section title="Additional Details">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Work Authorization / Visa Status">
            <SearchableSelect
              options={WORK_AUTHORIZATION_OPTIONS}
              value={form.workAuthorization}
              onValueChange={(v) => setField("workAuthorization", v)}
              placeholder="Select authorization"
            />
          </Field>
          <Field label="Preferred Work Mode">
            <SearchableSelect
              options={WORK_MODE_OPTIONS}
              value={form.preferredWorkMode}
              onValueChange={(v) => setField("preferredWorkMode", v)}
              placeholder="Remote / Hybrid / Onsite"
            />
          </Field>
        </div>
        <Field label="Referral Employee Name">
          <Input
            value={form.referralName}
            placeholder="Who referred this candidate?"
            onChange={(e) => setField("referralName", e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <Checkbox
            checked={form.willingToRelocate}
            onCheckedChange={(checked) =>
              setField("willingToRelocate", checked === true)
            }
          />
          Willingness to Relocate
        </label>
        <Field label="Remarks / Notes" error={err("notes")} fieldKey="notes">
          <Textarea
            value={form.notes}
            rows={3}
            maxLength={5000}
            placeholder="Internal notes about this candidate…"
            className={inputClass(!!err("notes"))}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </Field>
      </Section>
    </div>
  );
});
