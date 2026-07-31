export const PERF_NAME_ALLOWED = /^[\p{L}\p{N} \-–—/&().,':]+$/u;
export const PERF_NAME_ALLOWED_HINT = "letters, numbers, spaces and - – — / & ( ) . , ' :";
export const PERF_TEXT_FORBIDDEN = /[<>]/;

export type FieldErrors = Record<string, string>;

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function firstError(errors: FieldErrors): string | undefined {
  return Object.values(errors)[0];
}

export function validateNameField(
  raw: string,
  label: string,
  opts: { min?: number; max?: number } = {}
): string | undefined {
  const { min = 3, max = 100 } = opts;
  const v = raw.trim();
  if (!v) return `${label} is required.`;
  if (v.length < min) return `${label} must be at least ${min} characters.`;
  if (v.length > max) return `${label} must be ${max} characters or fewer.`;
  if (!PERF_NAME_ALLOWED.test(v)) return `${label} can only contain ${PERF_NAME_ALLOWED_HINT}.`;
  return undefined;
}

export function validateTextField(
  raw: string,
  label: string,
  opts: { min?: number; max?: number; required?: boolean } = {}
): string | undefined {
  const { min = 0, max = 2000, required = false } = opts;
  const v = raw.trim();
  if (!v) return required ? `${label} is required.` : undefined;
  if (v.length < min) return `${label} must be at least ${min} characters.`;
  if (v.length > max) return `${label} must be ${max} characters or fewer.`;
  if (PERF_TEXT_FORBIDDEN.test(v)) return `${label} cannot contain < or > characters.`;
  return undefined;
}

export const TARGET_VALUE_MAX_DIGITS = 10;

export function validateTargetValue(
  raw: string,
  opts: { required?: boolean; maxDigits?: number } = {}
): string | undefined {
  const { required = false, maxDigits = TARGET_VALUE_MAX_DIGITS } = opts;
  const v = raw.trim();
  if (!v) return required ? "Target value is required." : undefined;
  if (!/^\d+(\.\d+)?$/.test(v)) return "Target value must be a positive number (no negatives or letters).";
  const intPart = (v.split(".")[0] ?? "").replace(/^0+(?=\d)/, "");
  if (intPart.length > maxDigits) return `Target value can have at most ${maxDigits} digits.`;
  return undefined;
}

export function sanitizeTargetValueInput(raw: string, maxDigits = TARGET_VALUE_MAX_DIGITS): string {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  const [intPart = "", decPart] = cleaned.split(".");
  const cappedInt = intPart.slice(0, maxDigits);
  return decPart !== undefined ? `${cappedInt}.${decPart}` : cappedInt;
}

export function clampRatingInput(raw: string, min = 1, max = 5): string {
  const v = raw.replace(/[^\d]/g, "");
  if (!v) return "";
  const n = Math.max(min, Math.min(max, parseInt(v, 10)));
  return String(n);
}

export function isDateBefore(a: string, b: string): boolean {
  return !!a && !!b && a < b;
}

export function isDateAfter(a: string, b: string): boolean {
  return !!a && !!b && a > b;
}

export function isWithinInclusive(date: string, start: string, end: string): boolean {
  return !!date && (!start || date >= start) && (!end || date <= end);
}

export function employeeSelectOptions(
  employees: { id: string; name?: string | null; email?: string | null }[],
  excludeIds: string[] = []
): { value: string; label: string }[] {
  const exclude = new Set(excludeIds.filter(Boolean));
  return employees
    .filter((e) => Boolean(e.id?.trim()) && !exclude.has(e.id))
    .map((e) => ({ value: e.id, label: (e.name?.trim() || e.email || "Employee") as string }));
}

/** Parse local date + time (from `<input type="date">` / `time`) to ISO UTC for storage. */
export function localDateTimeToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function formatMeetingDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function expectedCycleEndDate(
  type: string,
  periodStart: string
): string | null {
  const info = REVIEW_CYCLE_TYPE_MAP[type];
  if (!info?.months || !periodStart) return null;
  return addMonthsEndDate(periodStart, info.months);
}

export function addMonthsEndDate(startISO: string, months: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startISO)) return "";
  const [y, m, d] = startISO.split("-").map(Number) as [number, number, number];
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCMonth(base.getUTCMonth() + months);
  base.setUTCDate(base.getUTCDate() - 1);
  return base.toISOString().slice(0, 10);
}

export interface ReviewCycleTypeInfo {
  value: "QUARTERLY" | "HALF_YEARLY" | "ANNUAL" | "CUSTOM";
  label: string;
  months: number | null;
  description: string;
}

export const REVIEW_CYCLE_TYPES: ReviewCycleTypeInfo[] = [
  {
    value: "QUARTERLY",
    label: "Quarterly",
    months: 3,
    description: "A focused 3-month cycle — fast feedback loops and short-term goals.",
  },
  {
    value: "HALF_YEARLY",
    label: "Half-Yearly",
    months: 6,
    description: "A 6-month cycle balancing goal-setting with a mid-year course correction.",
  },
  {
    value: "ANNUAL",
    label: "Annual",
    months: 12,
    description: "A full 12-month cycle for appraisals, ratings, and compensation decisions.",
  },
  {
    value: "CUSTOM",
    label: "Custom",
    months: null,
    description: "Define any start and end dates for ad-hoc or project-based reviews.",
  },
];

export const REVIEW_CYCLE_TYPE_MAP: Record<string, ReviewCycleTypeInfo> = Object.fromEntries(
  REVIEW_CYCLE_TYPES.map((t) => [t.value, t])
);

export function validateReviewCycleForm(input: {
  name: string;
  type?: string;
  periodStart: string;
  periodEnd: string;
  deadline: string;
  orgStartDate?: string | null;
}): FieldErrors {
  const errors: FieldErrors = {};
  const nameErr = validateNameField(input.name, "Cycle name");
  if (nameErr) errors.name = nameErr;

  if (!input.periodStart) errors.periodStart = "Start date is required.";
  else if (input.orgStartDate && isDateBefore(input.periodStart, input.orgStartDate)) {
    errors.periodStart = "Start date cannot be before the organization's start date.";
  }

  if (!input.periodEnd) errors.periodEnd = "End date is required.";
  else if (input.periodStart && isDateBefore(input.periodEnd, input.periodStart)) {
    errors.periodEnd = "End date must be on or after the start date.";
  } else if (input.type && input.type !== "CUSTOM" && input.periodStart) {
    const expected = expectedCycleEndDate(input.type, input.periodStart);
    if (expected && input.periodEnd !== expected) {
      const label = REVIEW_CYCLE_TYPE_MAP[input.type]?.label ?? input.type;
      errors.periodEnd = `For ${label} cycles, the end date should be ${expected}.`;
    }
  }

  if (input.deadline) {
    if (input.periodStart && isDateBefore(input.deadline, input.periodStart)) {
      errors.deadline = "Deadline must fall on or after the period start date.";
    } else if (input.periodEnd && isDateAfter(input.deadline, input.periodEnd)) {
      errors.deadline = "Deadline must fall on or before the period end date.";
    }
  }
  return errors;
}

export function validateReviewForm(input: {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  joiningDate?: string | null;
  cycleStart?: string | null;
  cycleEnd?: string | null;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.employeeId) errors.employeeId = "Employee is required.";
  if (!input.periodStart) errors.periodStart = "Start date is required.";
  if (!input.periodEnd) errors.periodEnd = "End date is required.";

  if (input.periodStart && input.joiningDate && isDateBefore(input.periodStart, input.joiningDate)) {
    errors.periodStart = "Start date cannot be before the employee's joining date.";
  }
  if (input.periodStart && input.periodEnd && isDateBefore(input.periodEnd, input.periodStart)) {
    errors.periodEnd = "End date must be on or after the start date.";
  }
  if (input.cycleStart && input.periodStart && isDateBefore(input.periodStart, input.cycleStart)) {
    errors.periodStart = "Start date must fall within the selected cycle's period.";
  }
  if (input.cycleEnd && input.periodEnd && isDateAfter(input.periodEnd, input.cycleEnd)) {
    errors.periodEnd = "End date must fall within the selected cycle's period.";
  }
  return errors;
}

export function validateGoalForm(input: {
  userId: string;
  title: string;
  description: string;
  targetValue: string;
  startDate: string;
  endDate: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.userId) errors.userId = "Employee is required.";
  const titleErr = validateNameField(input.title, "Title", { min: 3, max: 120 });
  if (titleErr) errors.title = titleErr;
  const descErr = validateTextField(input.description, "Description", { max: 2000 });
  if (descErr) errors.description = descErr;
  const targetErr = validateTargetValue(input.targetValue);
  if (targetErr) errors.targetValue = targetErr;
  if (!input.startDate) errors.startDate = "Start date is required.";
  if (!input.endDate) errors.endDate = "End date is required.";
  if (input.startDate && input.endDate && isDateBefore(input.endDate, input.startDate)) {
    errors.endDate = "End date must be on or after the start date.";
  }
  return errors;
}

export function validateMeetingForm(input: {
  employeeId: string;
  date: string;
  time: string;
  duration: string;
  meetingLink: string;
  agenda?: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.employeeId) errors.employeeId = "Employee is required.";
  if (!input.date) errors.date = "Date is required.";
  if (!input.time) errors.time = "Time is required.";
  const dur = Number(input.duration);
  if (!input.duration || Number.isNaN(dur) || dur < 15 || dur > 180) {
    errors.duration = "Duration must be between 15 and 180 minutes.";
  }
  if (input.meetingLink.trim()) {
    try {
      const u = new URL(input.meetingLink.trim());
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        errors.meetingLink = "Meeting link must be a valid URL.";
      }
    } catch {
      errors.meetingLink = "Meeting link must be a valid URL (e.g. https://meet.google.com/…).";
    }
  }
  const agenda = input.agenda;
  if (typeof agenda === "string") {
    const agendaErr = validateTextField(agenda, "Agenda", { max: 1000 });
    if (agendaErr) errors.agenda = agendaErr;
  }
  return errors;
}

export interface PipGoalInput {
  title: string;
  successCriteria: string;
  deadline: string;
  description?: string;
}

export function validatePipForm(input: {
  userId: string;
  hrRepId: string;
  reasons: { category: string; description: string }[];
  evidence: string;
  areas: string;
  goals: PipGoalInput[];
  startDate: string;
  endDate: string;
  reviewMethod: string;
  expectedImprovement: string;
  consequences: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.userId) errors.userId = "Employee is required.";
  if (!input.hrRepId) errors.hrRepId = "HR representative is required.";
  if (input.userId && input.userId === input.hrRepId) {
    errors.hrRepId = "HR representative must be different from the employee.";
  }

  if (!input.reasons.length) {
    errors.reasons = "Add at least one reason.";
  } else if (input.reasons.length > 5) {
    errors.reasons = "You can add at most 5 reasons.";
  } else {
    input.reasons.forEach((reason, index) => {
      const descErr = validateTextField(reason.description, `Reason ${index + 1} description`, {
        min: 10,
        max: 2000,
        required: true,
      });
      if (descErr) errors[`reasons.${index}.description`] = descErr;
    });
  }

  const evidenceErr = validateTextField(input.evidence, "Evidence", { min: 5, max: 8000, required: true });
  if (evidenceErr) errors.evidence = evidenceErr;

  const areasList = input.areas.split(",").map((s) => s.trim()).filter(Boolean);
  if (areasList.length === 0) errors.areas = "Add at least one area of concern.";

  if (!input.goals.length) {
    errors.goals = "At least one improvement goal is required.";
  } else if (input.goals.length > 10) {
    errors.goals = "Maximum 10 goals allowed.";
  } else {
    input.goals.forEach((goal, i) => {
      const titleErr = validateNameField(goal.title, `Goal ${i + 1} title`, { min: 3, max: 120 });
      if (titleErr) errors[`goals.${i}.title`] = titleErr;
      const criteriaErr = validateTextField(goal.successCriteria, `Goal ${i + 1} success criteria`, {
        min: 5,
        max: 2000,
        required: true,
      });
      if (criteriaErr) errors[`goals.${i}.successCriteria`] = criteriaErr;
      if (!goal.deadline) {
        errors[`goals.${i}.deadline`] = `Goal ${i + 1} deadline is required.`;
      } else if (
        input.startDate &&
        input.endDate &&
        !isWithinInclusive(goal.deadline, input.startDate, input.endDate)
      ) {
        errors[`goals.${i}.deadline`] = `Goal ${i + 1} deadline must fall within the PIP period.`;
      }
    });
  }

  const methodErr = validateTextField(input.reviewMethod, "Review method", { min: 2, max: 200, required: true });
  if (methodErr) errors.reviewMethod = methodErr;
  const expErr = validateTextField(input.expectedImprovement, "Expected improvement", { min: 3, max: 2000, required: true });
  if (expErr) errors.expectedImprovement = expErr;
  const consErr = validateTextField(input.consequences, "Consequences if not met", { min: 3, max: 2000, required: true });
  if (consErr) errors.consequences = consErr;

  if (!input.startDate) errors.startDate = "PIP start date is required.";
  if (!input.endDate) errors.endDate = "PIP end date is required.";
  if (input.startDate && input.endDate) {
    if (isDateBefore(input.endDate, input.startDate) || input.endDate === input.startDate) {
      errors.endDate = "End date must be after the start date.";
    } else {
      const diffDays =
        (new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / 86400000;
      if (diffDays < 7) errors.endDate = "PIP period must be at least 7 days.";
    }
  }
  return errors;
}
