export type FieldVisibility = "required" | "optional" | "hidden";

export interface ApplicationFieldConfig {
  phone?: FieldVisibility;
  location?: FieldVisibility;
  linkedinUrl?: FieldVisibility;
  githubUrl?: FieldVisibility;
  currentRole?: FieldVisibility;
  experienceYears?: FieldVisibility;
  coreSkills?: FieldVisibility;
  coverLetter?: FieldVisibility;
  resume?: FieldVisibility;
  education?: FieldVisibility;
  workExperience?: FieldVisibility;
  additionalSkills?: FieldVisibility;
  customLinks?: FieldVisibility;
}

export const APPLICATION_FIELD_DEFS: {
  key: keyof ApplicationFieldConfig;
  label: string;
  defaultVisibility: FieldVisibility;
}[] = [
  { key: "resume",          label: "Resume Upload",         defaultVisibility: "required" },
  { key: "phone",           label: "Phone Number",          defaultVisibility: "required" },
  { key: "location",        label: "Location",              defaultVisibility: "optional" },
  { key: "currentRole",     label: "Current Job Title",     defaultVisibility: "optional" },
  { key: "experienceYears", label: "Years of Experience",   defaultVisibility: "optional" },
  { key: "coreSkills",      label: "Core Skills",           defaultVisibility: "optional" },
  { key: "coverLetter",     label: "Cover Letter",          defaultVisibility: "optional" },
  { key: "education",       label: "Education History",     defaultVisibility: "optional" },
  { key: "workExperience",  label: "Work Experience",       defaultVisibility: "optional" },
  { key: "additionalSkills",label: "Additional Skills",     defaultVisibility: "optional" },
  { key: "linkedinUrl",     label: "LinkedIn URL",          defaultVisibility: "optional" },
  { key: "githubUrl",       label: "GitHub URL",            defaultVisibility: "optional" },
  { key: "customLinks",     label: "Portfolio / Custom Links", defaultVisibility: "optional" },
];

export const FIELD_VISIBILITY_LABELS: Record<FieldVisibility, string> = {
  required: "Required",
  optional: "Optional",
  hidden: "Hidden",
};

export function resolveFieldVisibility(
  config: ApplicationFieldConfig | null | undefined,
  key: keyof ApplicationFieldConfig,
): FieldVisibility {
  return config?.[key] ?? APPLICATION_FIELD_DEFS.find((d) => d.key === key)?.defaultVisibility ?? "optional";
}
