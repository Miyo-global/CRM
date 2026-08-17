import type { JobPostingStatus } from "@/types/hr";
import type { ApplicationFieldConfig } from "@/lib/hr/application-field-config";
import { DEFAULT_CURRENCY } from "@/lib/constants/locale";

export type JobOpeningFormStatus = "DRAFT" | "OPEN" | JobPostingStatus;

export interface JobOpeningFormState {
  title: string;
  departmentId: string;
  role: string;
  type: string;
  workMode: string;
  openings: string;
  country: string;
  stateCity: string;
  indiaState: string;
  indiaCity: string;
  officeLocation: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  salaryType: string;
  bonus: string;
  minExperience: string;
  maxExperience: string;
  educationLevel: string;
  requiredSkills: string[];
  preferredSkills: string[];
  tags: string[];
  overview: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  hiringManager: string;
  interviewRounds: string[];
  questionBank: string;
  resumeRequired: boolean;
  coverLetterRequired: boolean;
  customFields: string[];
  visibility: string;
  applicationDeadline: string;
  priority: string;
  referralEnabled: boolean;
  approvalRequired: boolean;
  status: JobOpeningFormStatus;
  hiringFlowTemplateId: string;
  applicationFields: ApplicationFieldConfig;
}

export const EMPTY_JOB_OPENING_FORM: JobOpeningFormState = {
  title: "",
  departmentId: "",
  role: "",
  type: "",
  workMode: "",
  openings: "",
  country: "",
  stateCity: "",
  indiaState: "",
  indiaCity: "",
  officeLocation: "",
  salaryMin: "",
  salaryMax: "",
  currency: DEFAULT_CURRENCY,
  salaryType: "ANNUAL",
  bonus: "",
  minExperience: "",
  maxExperience: "",
  educationLevel: "",
  requiredSkills: [],
  preferredSkills: [],
  tags: [],
  overview: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  hiringManager: "",
  interviewRounds: [],
  questionBank: "",
  resumeRequired: true,
  coverLetterRequired: false,
  customFields: [],
  visibility: "",
  applicationDeadline: "",
  priority: "",
  referralEnabled: true,
  approvalRequired: false,
  status: "DRAFT",
  hiringFlowTemplateId: "",
  applicationFields: {},
};

/** Raw job row from GET /hr/recruitment/jobs/:id */
export interface JobOpeningRecord {
  id: number;
  title: string;
  departmentId: number | null;
  role: string | null;
  type: string | null;
  workMode: string | null;
  openings: number | null;
  country: string | null;
  stateCity: string | null;
  officeLocation: string | null;
  location: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  currency: string | null;
  salaryType: string | null;
  bonus: string | null;
  minExperience: number | null;
  maxExperience: number | null;
  educationLevel: string | null;
  requiredSkills: string[] | null;
  preferredSkills: string[] | null;
  tags: string[] | null;
  overview: string | null;
  description: string | null;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  hiringManager: string | null;
  interviewRounds: string[] | null;
  questionBank: string | null;
  resumeRequired: boolean | null;
  coverLetterRequired: boolean | null;
  customFields: string[] | null;
  visibility: string | null;
  applicationDeadline: string | null;
  priority: string | null;
  referralEnabled: boolean | null;
  approvalRequired: boolean | null;
  status: JobPostingStatus | null;
  hiringFlowTemplateId: number | null;
  applicationFields?: ApplicationFieldConfig | null;
}

function formatSalaryInput(v: string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n));
}

function formatDeadline(v: string | null | undefined): string {
  if (!v) return "";
  return v.slice(0, 10);
}

function parseIndiaLocation(stateCity: string | null): { indiaState: string; indiaCity: string; stateCity: string } {
  if (!stateCity?.trim()) return { indiaState: "", indiaCity: "", stateCity: "" };
  const parts = stateCity.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { indiaState: parts[0], indiaCity: parts.slice(1).join(", "), stateCity: "" };
  }
  return { indiaState: parts[0] ?? "", indiaCity: "", stateCity: "" };
}

export function jobOpeningRecordToFormState(job: JobOpeningRecord): JobOpeningFormState {
  const country = job.country ?? "";
  const indiaParsed =
    country === "India" ? parseIndiaLocation(job.stateCity) : { indiaState: "", indiaCity: "", stateCity: job.stateCity ?? "" };

  const overview = job.overview?.trim() || job.description?.trim() || "";

  return {
    title: job.title ?? "",
    departmentId: job.departmentId != null ? String(job.departmentId) : "",
    role: job.role ?? "",
    type: job.type ?? "",
    workMode: job.workMode ?? "",
    openings: job.openings != null ? String(job.openings) : "",
    country,
    stateCity: indiaParsed.stateCity,
    indiaState: indiaParsed.indiaState,
    indiaCity: indiaParsed.indiaCity,
    officeLocation: job.officeLocation ?? job.location ?? "",
    salaryMin: formatSalaryInput(job.salaryMin),
    salaryMax: formatSalaryInput(job.salaryMax),
    currency: job.currency ?? "INR",
    salaryType: job.salaryType ?? "ANNUAL",
    bonus: job.bonus ?? "",
    minExperience: job.minExperience != null ? String(job.minExperience) : "",
    maxExperience: job.maxExperience != null ? String(job.maxExperience) : "",
    educationLevel: job.educationLevel ?? "",
    requiredSkills: job.requiredSkills ?? [],
    preferredSkills: job.preferredSkills ?? [],
    tags: job.tags ?? [],
    overview,
    responsibilities: job.responsibilities ?? "",
    requirements: job.requirements ?? "",
    benefits: job.benefits ?? "",
    hiringManager: job.hiringManager ?? "",
    interviewRounds: job.interviewRounds ?? [],
    questionBank: job.questionBank ?? "",
    resumeRequired: job.resumeRequired ?? true,
    coverLetterRequired: job.coverLetterRequired ?? false,
    customFields: job.customFields ?? [],
    visibility: job.visibility ?? "",
    applicationDeadline: formatDeadline(job.applicationDeadline),
    priority: job.priority ?? "",
    referralEnabled: job.referralEnabled ?? true,
    approvalRequired: job.approvalRequired ?? false,
    status: job.status ?? "DRAFT",
    hiringFlowTemplateId: job.hiringFlowTemplateId != null ? String(job.hiringFlowTemplateId) : "",
    applicationFields: job.applicationFields ?? {},
  };
}
