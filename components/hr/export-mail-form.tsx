"use client";

import { useMemo, useState, useCallback } from "react";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useHrEmployees } from "@/lib/api/hooks/hr/employees";
import type { Employee } from "@/types/hr";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ExportMailPerson = {
  email: string;
  name: string;
  role: string;
  label: string;
};

export function formatExportEmployeeLabel(e: Employee): string {
  const full = `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim();
  return full || e.name || e.email;
}

export function formatExportRole(role: string): string {
  return role
    .split("_")
    .map((t) => (t === "HR" || t === "CEO" ? t : t.charAt(0) + t.slice(1).toLowerCase()))
    .join(" ");
}

export function buildExportMailPeople(employees: Employee[]): ExportMailPerson[] {
  const seen = new Set<string>();
  const list: ExportMailPerson[] = [];
  for (const e of employees) {
    const email = e.email?.trim();
    if (!email) continue;
    const lower = email.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    const name = formatExportEmployeeLabel(e);
    list.push({ email, name, role: e.role, label: `${name} · ${formatExportRole(e.role)}` });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function useExportMailPeople() {
  const { data: employeesData } = useHrEmployees(undefined);
  const employees = useMemo<Employee[]>(
    () => (Array.isArray(employeesData) ? employeesData : []),
    [employeesData],
  );
  const people = useMemo(() => buildExportMailPeople(employees), [employees]);
  const hrEmails = useMemo(
    () => people.filter((p) => p.role === "HR" || p.role === "BRANCH_HR").map((p) => p.email),
    [people],
  );
  const ceoEmails = useMemo(() => people.filter((p) => p.role === "CEO").map((p) => p.email), [people]);
  return { people, hrEmails, ceoEmails };
}

export function useExportMailRecipients() {
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const reset = useCallback(() => {
    setTo([]);
    setCc([]);
    setBcc([]);
    setSubject("");
    setMessage("");
  }, []);

  const addToRecipients = useCallback((emails: string[]) => {
    if (emails.length === 0) return;
    const lower = new Set(emails.map((e) => e.toLowerCase()));
    setTo((prev) => Array.from(new Set([...prev, ...emails])));
    setCc((prev) => prev.filter((e) => !lower.has(e.toLowerCase())));
    setBcc((prev) => prev.filter((e) => !lower.has(e.toLowerCase())));
  }, []);

  const validateRecipients = useCallback((): string | null => {
    if (to.length === 0) return "Add at least one recipient in the To field";
    const allEntries: [string, string][] = [
      ...to.map((e): [string, string] => [e, "To"]),
      ...cc.map((e): [string, string] => [e, "CC"]),
      ...bcc.map((e): [string, string] => [e, "BCC"]),
    ];
    for (const [email, field] of allEntries) {
      if (!EMAIL_RE.test(email.trim())) {
        return `Invalid email in ${field}: "${email}"`;
      }
    }
    const normalized = allEntries.map(([e]) => e.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      return "A recipient appears in more than one field (To, CC, or BCC)";
    }
    return null;
  }, [to, cc, bcc]);

  return {
    to,
    setTo,
    cc,
    setCc,
    bcc,
    setBcc,
    subject,
    setSubject,
    message,
    setMessage,
    reset,
    addToRecipients,
    validateRecipients,
  };
}

export function ExportRecipientCombobox({
  people,
  values,
  onChange,
  excludeEmails,
  placeholder,
  searchPlaceholder,
}: {
  people: ExportMailPerson[];
  values: string[];
  onChange: (next: string[]) => void;
  excludeEmails: string[];
  placeholder: string;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const excludeSet = useMemo(
    () => new Set(excludeEmails.map((e) => e.toLowerCase())),
    [excludeEmails],
  );
  const valueSet = useMemo(() => new Set(values.map((e) => e.toLowerCase())), [values]);
  const labelByEmail = useMemo(
    () => new Map(people.map((p) => [p.email.toLowerCase(), p.label])),
    [people],
  );

  const visiblePeople = useMemo(
    () => people.filter((p) => !excludeSet.has(p.email.toLowerCase())),
    [people, excludeSet],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalizedQuery
        ? visiblePeople.filter(
            (p) =>
              p.label.toLowerCase().includes(normalizedQuery) ||
              p.email.toLowerCase().includes(normalizedQuery),
          )
        : visiblePeople,
    [visiblePeople, normalizedQuery],
  );

  const isValidEmail = EMAIL_RE.test(normalizedQuery);
  const usedElsewhere = isValidEmail && excludeSet.has(normalizedQuery);
  const canAddCustom =
    isValidEmail &&
    !usedElsewhere &&
    !valueSet.has(normalizedQuery) &&
    !visiblePeople.some((p) => p.email.toLowerCase() === normalizedQuery);

  const toggle = (email: string) => {
    const lower = email.toLowerCase();
    onChange(
      values.some((v) => v.toLowerCase() === lower)
        ? values.filter((v) => v.toLowerCase() !== lower)
        : [...values, email],
    );
  };

  const addCustom = () => {
    if (!canAddCustom) return;
    onChange([...values, normalizedQuery]);
    setQuery("");
  };

  const triggerText =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? labelByEmail.get(values[0]!.toLowerCase()) ?? values[0]!
        : `${values.length} recipients`;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-9 w-full justify-between text-sm font-normal",
              values.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">{triggerText}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command
            shouldFilter={false}
            className="flex h-auto max-h-[min(300px,70vh)] min-h-0 w-full flex-col overflow-hidden"
          >
            <CommandInput
              placeholder={searchPlaceholder}
              className="h-9 shrink-0"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList
              className="max-h-[min(240px,60vh)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              {filtered.length === 0 && !canAddCustom ? (
                <CommandEmpty>
                  {usedElsewhere
                    ? "This email is already in another recipient field."
                    : "No matching people. Type a full email to add."}
                </CommandEmpty>
              ) : null}
              {canAddCustom ? (
                <CommandGroup>
                  <CommandItem value={`add-${normalizedQuery}`} onSelect={addCustom} className="gap-2">
                    <span className="text-muted-foreground">Add</span>
                    <span className="truncate font-medium">{normalizedQuery}</span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
              {filtered.length > 0 ? (
                <CommandGroup>
                  {filtered.map((p) => {
                    const selected = valueSet.has(p.email.toLowerCase());
                    return (
                      <CommandItem
                        key={p.email}
                        value={p.email}
                        onSelect={() => toggle(p.email)}
                        className="gap-2"
                      >
                        <Checkbox
                          checked={selected}
                          tabIndex={-1}
                          aria-hidden
                          className="pointer-events-none rounded-[3px]"
                        />
                        <span className="truncate">{p.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((email) => {
            const label = labelByEmail.get(email.toLowerCase()) ?? email;
            return (
              <span
                key={email}
                className="inline-flex max-w-full items-center gap-1 rounded-[3px] border bg-muted/40 px-2 py-1 text-xs"
              >
                <span className="truncate">{label}</span>
                <button
                  type="button"
                  className="ml-0.5 rounded-[2px] p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${label}`}
                  onClick={() => onChange(values.filter((v) => v !== email))}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export interface ExportMailFieldsProps {
  people: ExportMailPerson[];
  hrEmails: string[];
  ceoEmails: string[];
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  message: string;
  onToChange: (values: string[]) => void;
  onCcChange: (values: string[]) => void;
  onBccChange: (values: string[]) => void;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onAddToRecipients: (emails: string[]) => void;
  subjectPlaceholder?: string;
  sendLabel: string;
  sending?: boolean;
  sendDisabled?: boolean;
  onSend: () => void;
}

export function ExportMailFields({
  people,
  hrEmails,
  ceoEmails,
  to,
  cc,
  bcc,
  subject,
  message,
  onToChange,
  onCcChange,
  onBccChange,
  onSubjectChange,
  onMessageChange,
  onAddToRecipients,
  subjectPlaceholder = "Default subject will be used if empty",
  sendLabel,
  sending = false,
  sendDisabled = false,
  onSend,
}: ExportMailFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">To</Label>
          {hrEmails.length > 0 || ceoEmails.length > 0 ? (
            <div className="flex items-center gap-1">
              {hrEmails.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onAddToRecipients(hrEmails)}
                >
                  + All HR
                </Button>
              ) : null}
              {ceoEmails.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onAddToRecipients(ceoEmails)}
                >
                  + CEO
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <ExportRecipientCombobox
          people={people}
          values={to}
          onChange={onToChange}
          excludeEmails={[...cc, ...bcc]}
          placeholder="Select recipients…"
          searchPlaceholder="Search people or type an email…"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">CC</Label>
          <ExportRecipientCombobox
            people={people}
            values={cc}
            onChange={onCcChange}
            excludeEmails={[...to, ...bcc]}
            placeholder="Add CC…"
            searchPlaceholder="Search or type an email…"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">BCC</Label>
          <ExportRecipientCombobox
            people={people}
            values={bcc}
            onChange={onBccChange}
            excludeEmails={[...to, ...cc]}
            placeholder="Add BCC…"
            searchPlaceholder="Search or type an email…"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Subject (optional)</Label>
        <Input
          className="h-9"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder={subjectPlaceholder}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message (optional)</Label>
        <Textarea
          rows={3}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Short note to include above the report summary…"
        />
      </div>
      <Button className="w-full gap-2" onClick={onSend} disabled={sending || sendDisabled}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sendLabel}
      </Button>
    </div>
  );
}
