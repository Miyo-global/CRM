"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { CustomFieldDefinition } from "@/lib/api/hooks/crm";
import {
  HR_EMAIL_MERGE_FIELD_CATALOG,
  type HrEmailMergeField,
} from "@/lib/hr/hr-email-auto-merge-keys";
import {
  validateTemplateName,
  TEMPLATE_NAME_MAX,
  TEMPLATE_SUBJECT_MAX,
  TEMPLATE_BODY_MAX,
  type TemplateFieldErrors,
} from "@/lib/hr/email-template-validation";

export const TEMPLATE_CATEGORIES = [
  "General",
  "Onboarding",
  "Offboarding",
  "Offer letter",
  "Leave",
  "Attendance / discipline",
  "Warning / Discipline & Attendance",
  "Performance",
  "Performance Management",
  "Disciplinary",
  "Recruitment",
  "Compensation",
  "Appreciation / Recognition",
  "Admin / Action Notices",
];

interface VariableEntry {
  key: string;
  description: string;
}

const COMMON_VARS: VariableEntry[] = [
  { key: "name", description: "Employee full name" },
  { key: "firstName", description: "Employee first name" },
  { key: "email", description: "Work email address" },
  { key: "department", description: "Department name" },
  { key: "designation", description: "Job title / designation" },
  { key: "date", description: "Today's date (long format)" },
];

const CATEGORY_EXTRA_VARS: Record<string, VariableEntry[]> = {
  Onboarding: [
    { key: "joiningDate", description: "Date of joining" },
    { key: "employeeCode", description: "Employee code / ID" },
    { key: "assetList", description: "List of assets to be issued" },
    { key: "meetingDate", description: "Orientation meeting date" },
    { key: "meetingTime", description: "Orientation meeting time" },
  ],
  Offboarding: [
    { key: "lastWorkingDay", description: "Last working day" },
    { key: "employeeCode", description: "Employee code / ID" },
  ],
  "Offer letter": [
    { key: "newSalary", description: "Offered salary (CTC)" },
    { key: "joiningDate", description: "Proposed joining date" },
    { key: "designation", description: "Offered designation" },
  ],
  Leave: [
    { key: "due_date", description: "Leave approval deadline" },
  ],
  "Attendance / discipline": [
    { key: "incident_details", description: "Details of the incident" },
    { key: "due_date", description: "Response / action due date" },
    { key: "policy_name", description: "Policy name referenced" },
  ],
  "Warning / Discipline & Attendance": [
    { key: "incident_details", description: "Details of the incident" },
    { key: "due_date", description: "Response due date" },
    { key: "policy_name", description: "Policy name referenced" },
  ],
  Performance: [
    { key: "review_start_date", description: "Review period start date" },
    { key: "review_end_date", description: "Review period end date" },
    { key: "performance_area", description: "Area under review" },
    { key: "meeting_agenda", description: "Review meeting agenda" },
  ],
  "Performance Management": [
    { key: "review_start_date", description: "Review period start date" },
    { key: "review_end_date", description: "Review period end date" },
    { key: "performance_area", description: "Area under review" },
  ],
  Disciplinary: [
    { key: "incident_details", description: "Details of the incident" },
    { key: "due_date", description: "Response due date" },
    { key: "policy_name", description: "Policy name referenced" },
  ],
  Recruitment: [
    { key: "candidateName", description: "Candidate full name" },
    { key: "candidateEmail", description: "Candidate email address" },
    { key: "candidateFirstName", description: "Candidate first name" },
  ],
  Compensation: [
    { key: "effectiveDate", description: "Salary revision effective date" },
    { key: "newSalary", description: "Revised salary amount" },
    { key: "revised_monthly_salary", description: "Revised monthly salary" },
  ],
  "Appreciation / Recognition": [
    { key: "occasion", description: "Occasion or milestone" },
  ],
  "Admin / Action Notices": [
    { key: "due_date", description: "Action due date" },
    { key: "policy_name", description: "Policy name referenced" },
  ],
};

function VariableHelpPanel({
  category,
  onInsert,
}: {
  category: string;
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const extraVars = CATEGORY_EXTRA_VARS[category] ?? [];
  const allVars = [...COMMON_VARS, ...extraVars];

  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Available variables{category ? ` — ${category}` : ""}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border/40 px-3 pb-3 pt-2">
          <p className="mb-2 text-[11px] text-muted-foreground">
            Click a variable to insert it at the cursor position in Subject or Body.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allVars.map(({ key, description }) => (
              <button
                key={key}
                type="button"
                title={description}
                onClick={() => onInsert(`{{${key}}}`)}
                className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-foreground hover:bg-muted/70 transition-colors"
              >
                {`{{${key}}}`}
              </button>
            ))}
          </div>
          {extraVars.length > 0 && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Bold-bordered variables are specific to <span className="font-medium">{category}</span> templates.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function InsertFieldPopover({
  customFields,
  onInsert,
}: {
  customFields: CustomFieldDefinition[];
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const pick = useCallback(
    (key: string) => {
      onInsert(`{{${key}}}`);
      setOpen(false);
    },
    [onInsert]
  );

  const profileFields = HR_EMAIL_MERGE_FIELD_CATALOG.filter((f) => f.group === "Employee profile");
  const dateFields = HR_EMAIL_MERGE_FIELD_CATALOG.filter((f) => f.group === "Date");

  const renderMergeItem = (f: HrEmailMergeField) => (
    <CommandItem key={f.key} value={`${f.label} ${f.key}`} onSelect={() => pick(f.key)}>
      <span className="flex-1 truncate">{f.label}</span>
      <code className="text-[10px] text-muted-foreground">{`{{${f.key}}}`}</code>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Insert field
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search fields…" className="text-xs" />
          <CommandList>
            <CommandEmpty>No fields found.</CommandEmpty>
            <CommandGroup heading="Employee profile">{profileFields.map(renderMergeItem)}</CommandGroup>
            <CommandGroup heading="Date">{dateFields.map(renderMergeItem)}</CommandGroup>
            {customFields.length > 0 && (
              <CommandGroup heading="Custom fields">
                {customFields.map((f) => (
                  <CommandItem
                    key={f.id}
                    value={`${f.label} ${f.name} custom`}
                    onSelect={() => pick(f.name)}
                  >
                    <span className="flex-1 truncate">{f.label}</span>
                    <code className="text-[10px] text-muted-foreground">{`{{${f.name}}}`}</code>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function TemplateFieldInput({
  fieldKey,
  value,
  onChange,
  customField,
}: {
  fieldKey: string;
  value: string;
  onChange: (v: string) => void;
  customField?: CustomFieldDefinition;
}) {
  const id = `tv-${fieldKey}`;
  const label = customField?.label ?? fieldKey;

  const labelRow = (
    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5" htmlFor={id}>
      <span className="truncate">{label}</span>
      <code className="text-[10px]">{`{{${fieldKey}}}`}</code>
      {customField && (
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          Custom
        </Badge>
      )}
    </label>
  );

  if (customField?.fieldType === "select" && customField.options?.length) {
    return (
      <div className="space-y-0.5">
        {labelRow}
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-8 text-xs">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {customField.options.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (customField?.fieldType === "boolean") {
    return (
      <div className="space-y-0.5">
        {labelRow}
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-8 text-xs">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes" className="text-xs">
              Yes
            </SelectItem>
            <SelectItem value="No" className="text-xs">
              No
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  const inputType =
    customField?.fieldType === "date" ? "date" : customField?.fieldType === "number" ? "number" : "text";

  return (
    <div className="space-y-0.5">
      {labelRow}
      <Input
        id={id}
        type={inputType}
        className="h-8 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fieldKey}
      />
    </div>
  );
}

export function TemplateFormFields({
  name,
  setName,
  subject,
  setSubject,
  body,
  setBody,
  category,
  setCategory,
  errors,
  customFields,
}: {
  name: string;
  setName: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  errors: TemplateFieldErrors;
  customFields: CustomFieldDefinition[];
  }) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  const insertToken = useCallback(
    (token: string) => {
      if (lastFocused.current === "subject") {
        const el = subjectRef.current;
        const start = el?.selectionStart ?? subject.length;
        const end = el?.selectionEnd ?? subject.length;
        const next = subject.slice(0, start) + token + subject.slice(end);
        setSubject(next);
        requestAnimationFrame(() => {
          if (el) {
            const pos = start + token.length;
            el.focus();
            el.setSelectionRange(pos, pos);
          }
        });
      } else {
        const el = bodyRef.current;
        const start = el?.selectionStart ?? body.length;
        const end = el?.selectionEnd ?? body.length;
        const next = body.slice(0, start) + token + body.slice(end);
        setBody(next);
        requestAnimationFrame(() => {
          if (el) {
            const pos = start + token.length;
            el.focus();
            el.setSelectionRange(pos, pos);
          }
        });
      }
    },
    [subject, body, setSubject, setBody]
  );

  const liveNameError = name.trim() ? validateTemplateName(name) : undefined;
  const nameError = errors.name ?? liveNameError;

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor="template-name">
            Template Name
          </label>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {name.length}/{TEMPLATE_NAME_MAX}
          </span>
        </div>
        <Input
          id="template-name"
          placeholder="e.g., Late coming — first warning"
          value={name}
          maxLength={TEMPLATE_NAME_MAX}
          aria-invalid={nameError ? true : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        {nameError && <p className="text-[11px] text-destructive">{nameError}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2">
        <p className="text-[11px] text-muted-foreground">
          Insert a merge or custom field into the last-edited field (Subject or Body).
        </p>
        <InsertFieldPopover customFields={customFields} onInsert={insertToken} />
      </div>

      <VariableHelpPanel category={category} onInsert={insertToken} />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor="template-subject">
            Subject Line
          </label>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {subject.length}/{TEMPLATE_SUBJECT_MAX}
          </span>
        </div>
        <Input
          id="template-subject"
          ref={subjectRef}
          placeholder="Email subject"
          value={subject}
          maxLength={TEMPLATE_SUBJECT_MAX}
          aria-invalid={errors.subject ? true : undefined}
          onFocus={() => {
            lastFocused.current = "subject";
          }}
          onChange={(e) => setSubject(e.target.value)}
        />
        {errors.subject && <p className="text-[11px] text-destructive">{errors.subject}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor="template-body">
            Body
          </label>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {body.length}/{TEMPLATE_BODY_MAX}
          </span>
        </div>
        <Textarea
          id="template-body"
          ref={bodyRef}
          placeholder="HTML or plain text. Use {{name}}, {{date}}, {{department}}, …"
          value={body}
          rows={8}
          maxLength={TEMPLATE_BODY_MAX}
          aria-invalid={errors.body ? true : undefined}
          onFocus={() => {
            lastFocused.current = "body";
          }}
          onChange={(e) => setBody(e.target.value)}
        />
        {errors.body && <p className="text-[11px] text-destructive">{errors.body}</p>}
      </div>
    </>
  );
}
