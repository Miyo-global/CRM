export const HR_EMAIL_EMPLOYEE_AUTO_MERGE_KEYS = [
  "name",
  "firstName",
  "lastName",
  "email",
  "employeeCode",
  "designation",
  "department",
  "joiningDate",
  "phone",
  "date",
  "today",
  "employee_name",
  "employeeName",
  "full_name",
  "fullName",
] as const;

export const HR_EMAIL_CANDIDATE_AUTO_MERGE_KEYS = [
  "candidateName",
  "candidate_name",
  "candidateEmail",
  "candidateFirstName",
  "candidateLastName",
] as const;

export const HR_EMAIL_EMPLOYEE_AUTO_MERGE_KEY_SET = new Set<string>(
  HR_EMAIL_EMPLOYEE_AUTO_MERGE_KEYS as unknown as string[]
);

export const HR_EMAIL_CANDIDATE_AUTO_MERGE_KEY_SET = new Set<string>(
  HR_EMAIL_CANDIDATE_AUTO_MERGE_KEYS as unknown as string[]
);

export interface HrEmailMergeField {
  key: string;
  label: string;
  group: "Employee profile" | "Date";
}

export const HR_EMAIL_MERGE_FIELD_CATALOG: HrEmailMergeField[] = [
  { key: "name", label: "Full name", group: "Employee profile" },
  { key: "firstName", label: "First name", group: "Employee profile" },
  { key: "lastName", label: "Last name", group: "Employee profile" },
  { key: "email", label: "Work email", group: "Employee profile" },
  { key: "employeeCode", label: "Employee code", group: "Employee profile" },
  { key: "designation", label: "Designation", group: "Employee profile" },
  { key: "department", label: "Department", group: "Employee profile" },
  { key: "joiningDate", label: "Joining date", group: "Employee profile" },
  { key: "phone", label: "Phone", group: "Employee profile" },
  { key: "date", label: "Today (long date)", group: "Date" },
  { key: "today", label: "Today (YYYY-MM-DD)", group: "Date" },
];
