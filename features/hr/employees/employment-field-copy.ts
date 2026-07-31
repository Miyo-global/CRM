
export const EMPLOYMENT_FIELD_COPY = {
  department: {
    label: "Department (Team)",
    placeholder: "Select department",
    description:
      "The organizational team this person belongs to (e.g. Engineering, Sales). Used for org chart, filters, and reporting—not app permissions.",
  },
  designation: {
    label: "Job Title (Designation)",
    placeholder: "e.g. Senior Software Engineer",
    description: "Their official job title on record. This is separate from department and system role.",
  },
  systemRole: {
    label: "System Role (App Access)",
    placeholder: "Select system role",
    description:
      "Controls what they can access in this CRM (modules, approvals, admin actions). Does not change their department or job title.",
  },
} as const;
