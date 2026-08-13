"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { sanitizeHtml } from "@/lib/sanitize";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { useHrEmployees } from "@/lib/api/hooks/hr/employees";
import type { Employee } from "@/types/hr";
import type { CustomFieldDefinition } from "@/lib/api/hooks/crm";
import {
  Plus,
  Mail,
  Trash2,
  Copy,
  Pencil,
  Eye,
  Send,
  Search,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { HR_EMAIL_EMPLOYEE_AUTO_MERGE_KEY_SET } from "@/lib/hr/hr-email-auto-merge-keys";
import {
  validateTemplateForm,
  type TemplateFieldErrors,
} from "@/lib/hr/email-template-validation";
import { TemplateFormFields, TemplateFieldInput } from "./_components/template-form";

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  variables: string[] | null;
  createdAt: string | null;
}

const etKeys = {
  all: [...queryKeys.hr.all, "email-templates"] as const,
  list: () => [...etKeys.all, "list"] as const,
};

const SAMPLE_PREVIEW_VARS: Record<string, string> = {
  name: "Priya Sharma",
  firstName: "Priya",
  lastName: "Sharma",
  email: "priya.sharma@example.com",
  employeeCode: "EMP-1024",
  designation: "Senior Associate",
  department: "Sales",
  joiningDate: "2024-06-01",
  phone: "+91 98765 43210",
  date: new Date().toLocaleDateString(undefined, { dateStyle: "long" }),
  today: new Date().toISOString().slice(0, 10),
  candidateName: "Rahul Verma",
  candidateEmail: "rahul@example.com",
  candidateFirstName: "Rahul",
  candidateLastName: "Verma",
  candidate_name: "Rahul Verma",
  employee_name: "Priya Sharma",
  employeeName: "Priya Sharma",
  full_name: "Priya Sharma",
  fullName: "Priya Sharma",
  review_start_date: "17 February 2026",
  review_end_date: "17 April 2026",
  performance_area: "the assigned sales expectations",
  revised_monthly_salary: "₹7,000",
  due_date: "14 February 2026",
  policy_name: "IT acceptable use",
  incident_details: "a client meeting dispute",
  meeting_agenda: "annual goals discussion",
  occasion: "5th work anniversary",
  effectiveDate: "1 March 2026",
  newSalary: "₹12,00,000 p.a.",
  assetList: "Laptop, monitor, headset",
  meetingDate: "20 February 2026",
  meetingTime: "15:00 IST",
  lastWorkingDay: "28 February 2026",
};

function applyTemplateMerges(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return vars[key] ?? "";
  });
}

function mergePreviewText(text: string): string {
  return applyTemplateMerges(text, SAMPLE_PREVIEW_VARS);
}

const MERGE_VARIABLES_LINES = [
  "From employee profile (directory send, or custom send + “Merge fields from”): {{name}}, {{firstName}}, {{lastName}}, {{email}}, {{employeeCode}}, {{designation}}, {{department}}, {{joiningDate}}, {{phone}}, {{date}}, {{today}} — plus aliases {{employee_name}}, {{full_name}}.",
  "Custom fields you create in Settings → Custom fields can be inserted with the “Insert field” picker, then mapped to a value when you click Send.",
  "Template-specific placeholders appear as fields when you click Send (e.g. {{due_date}}, {{policy_name}}). You can still use Extra variables (key=value) to override.",
  "Recruitment (API / candidate): {{candidateName}}, {{candidate_name}}, {{candidateEmail}}, {{candidateFirstName}}, {{candidateLastName}}.",
  "Other: one line per key in Extra variables (key=value). Spaces inside {{ }} are OK.",
];

function parseEmailList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const s = part.trim();
    if (!s || seen.has(s)) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function extractMergeKeys(subject: string, body: string): Set<string> {
  const keys = new Set<string>();
  const text = `${subject}\n${body}`;
  for (const match of text.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const k = String(match[1] ?? "").trim();
    if (k) keys.add(k);
  }
  return keys;
}

function EmailTemplatesContent() {
  const qc = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: etKeys.list(),
    queryFn: () => apiClient.get<EmailTemplate[]>("/hr/email-templates"),
  });

  const { data: rawEmployees, isLoading: employeesLoading } = useHrEmployees({
    page: 1,
    limit: 500,
  });

  const { data: customFieldsResp } = useQuery({
    queryKey: ["custom-fields", "all"] as const,
    queryFn: () =>
      apiClient.get<{ fields: CustomFieldDefinition[] }>("/settings/custom-fields"),
    retry: false,
    staleTime: 60_000,
  });

  const employees = useMemo(() => {
    const list = Array.isArray(rawEmployees)
      ? rawEmployees
      : (rawEmployees as { data?: Employee[] })?.data ?? [];
    return list as Employee[];
  }, [rawEmployees]);

  const customFields = useMemo(() => {
    const list = customFieldsResp?.fields ?? [];
    const seen = new Set<string>();
    const out: CustomFieldDefinition[] = [];
    for (const f of list) {
      if (f.isActive === false) continue;
      if (seen.has(f.name)) continue;
      seen.add(f.name);
      out.push(f);
    }
    return out;
  }, [customFieldsResp]);

  const customFieldByName = useMemo(
    () => new Map(customFields.map((f) => [f.name, f])),
    [customFields]
  );

  const create = useMutation({
    mutationFn: (data: { name: string; subject: string; body: string; category?: string }) =>
      apiClient.post<EmailTemplate>("/hr/email-templates", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: etKeys.list() }),
  });

  const update = useMutation({
    mutationFn: (data: {
      id: number;
      name: string;
      subject: string;
      body: string;
      category?: string;
    }) =>
      apiClient.patch<EmailTemplate>(`/hr/email-templates/${data.id}`, {
        name: data.name,
        subject: data.subject,
        body: data.body,
        category: data.category,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: etKeys.list() }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/email-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: etKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [formErrors, setFormErrors] = useState<TemplateFieldErrors>({});

  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [sendTemplate, setSendTemplate] = useState<EmailTemplate | null>(null);
  const [sendMode, setSendMode] = useState<"directory" | "custom">("directory");
  const [sendSearch, setSendSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sendExtraVars, setSendExtraVars] = useState("");
  const [customEmailsRaw, setCustomEmailsRaw] = useState("");
  const [mergeSourceUserId, setMergeSourceUserId] = useState<string>("");
  const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);

  const resetTemplateForm = useCallback(() => {
    setName("");
    setSubject("");
    setBody("");
    setCategory("General");
    setFormErrors({});
  }, []);

  const sendTemplateKeys = useMemo(() => {
    if (!sendTemplate) return new Set<string>();
    return extractMergeKeys(sendTemplate.subject, sendTemplate.body);
  }, [sendTemplate]);

  const mergeFilledFromEmployeeProfile = useMemo(
    () => sendMode === "directory" || (sendMode === "custom" && mergeSourceUserId !== ""),
    [sendMode, mergeSourceUserId]
  );

  const keysNeedingManualInput = useMemo(() => {
    if (!sendTemplate) return [];
    const keys = [...sendTemplateKeys];
    const filtered = mergeFilledFromEmployeeProfile
      ? keys.filter((k) => !HR_EMAIL_EMPLOYEE_AUTO_MERGE_KEY_SET.has(k))
      : keys;
    return filtered.sort((a, b) => a.localeCompare(b));
  }, [sendTemplate, sendTemplateKeys, mergeFilledFromEmployeeProfile]);

  const handleCreate = useCallback(() => {
    const errors = validateTemplateForm({ name, subject, body });
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors).join(" "));
      return;
    }
    create.mutate(
      { name: name.trim(), subject: subject.trim(), body: body.trim(), category },
      {
        onSuccess: () => {
          toast.success("Template created");
          setSheetOpen(false);
          resetTemplateForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [name, subject, body, category, create, resetTemplateForm]);

  const startEdit = useCallback((t: EmailTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setCategory(t.category ?? "General");
    setFormErrors({});
    setEditSheetOpen(true);
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (editingId === null) return;
    const errors = validateTemplateForm({ name, subject, body });
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors).join(" "));
      return;
    }
    update.mutate(
      {
        id: editingId,
        name: name.trim(),
        subject: subject.trim(),
        body: body.trim(),
        category,
      },
      {
        onSuccess: () => {
          toast.success("Template updated");
          setEditSheetOpen(false);
          setEditingId(null);
          resetTemplateForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [editingId, name, subject, body, category, update, resetTemplateForm]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    remove.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, remove]);

  const handleCopy = useCallback((t: EmailTemplate) => {
    navigator.clipboard.writeText(t.body);
    toast.success("Template body copied");
  }, []);

  const openSend = useCallback((t: EmailTemplate) => {
    setSendTemplate(t);
    setSendMode("directory");
    setSelectedUserIds(new Set());
    setSendSearch("");
    setSendExtraVars("");
    setCustomEmailsRaw("");
    setMergeSourceUserId("");
    setTemplateVarValues({});
  }, []);

  const setTemplateVarField = useCallback((key: string, value: string) => {
    setTemplateVarValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const parseExtraVariables = useCallback((): Record<string, string> => {
    const raw = sendExtraVars.trim();
    const out: Record<string, string> = {};
    if (!raw) return out;
    for (const line of raw.split(/\n/)) {
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k) out[k] = v;
    }
    return out;
  }, [sendExtraVars]);

  const buildSendVariables = useCallback((): Record<string, string> => {
    const fromLines = parseExtraVariables();
    return { ...templateVarValues, ...fromLines };
  }, [parseExtraVariables, templateVarValues]);

  const handleSendBatch = useCallback(async () => {
    if (!sendTemplate || selectedUserIds.size === 0) {
      toast.error("Select at least one employee");
      return;
    }
    setIsSending(true);
    const vars = buildSendVariables();
    const ids = Array.from(selectedUserIds);
    let okCount = 0;
    let fail = 0;
    let firstError: string | null = null;
    for (const employeeUserId of ids) {
      try {
        await apiClient.post("/hr/integrations/send-email", {
          templateId: sendTemplate.id,
          employeeUserId,
          subject: "-",
          body: "-",
          ...(Object.keys(vars).length ? { variables: vars } : {}),
        });
        okCount += 1;
      } catch (e) {
        fail += 1;
        if (!firstError) firstError = getErrorMessage(e);
      }
    }
    if (fail === 0) toast.success(`Sent ${okCount} email(s)`);
    else if (okCount === 0) toast.error(firstError ?? `Failed to send ${fail} email(s)`);
    else toast.warning(`${firstError ?? "Some sends failed"} (${okCount} sent, ${fail} failed)`);
    setSendTemplate(null);
    setSelectedUserIds(new Set());
    setIsSending(false);
  }, [sendTemplate, selectedUserIds, buildSendVariables]);

  const handleSendCustom = useCallback(async () => {
    if (!sendTemplate) return;
    const emails = parseEmailList(customEmailsRaw);
    if (emails.length === 0) {
      toast.error("Enter at least one valid email (comma, space, or newline separated)");
      return;
    }
    setIsSending(true);
    const vars = buildSendVariables();
    const varPayload = Object.keys(vars).length ? vars : undefined;
    let okCount = 0;
    let fail = 0;
    let firstError: string | null = null;
    for (const to of emails) {
      try {
        await apiClient.post("/hr/integrations/send-email", {
          to,
          templateId: sendTemplate.id,
          subject: "-",
          body: "-",
          ...(mergeSourceUserId ? { mergeDataFromUserId: mergeSourceUserId } : {}),
          ...(varPayload ? { variables: varPayload } : {}),
        });
        okCount += 1;
      } catch (e) {
        fail += 1;
        if (!firstError) firstError = getErrorMessage(e);
      }
    }
    if (fail === 0) toast.success(`Sent ${okCount} email(s)`);
    else if (okCount === 0) toast.error(firstError ?? `Failed to send ${fail} email(s)`);
    else toast.warning(`${firstError ?? "Some sends failed"} (${okCount} sent, ${fail} failed)`);
    setSendTemplate(null);
    setCustomEmailsRaw("");
    setIsSending(false);
  }, [sendTemplate, customEmailsRaw, mergeSourceUserId, buildSendVariables]);

  const handleSendSubmit = useCallback(async () => {
    if (sendMode === "directory") await handleSendBatch();
    else await handleSendCustom();
  }, [sendMode, handleSendBatch, handleSendCustom]);

  const filteredSendEmployees = useMemo(() => {
    const q = sendSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const label =
        `${e.firstName ?? ""} ${e.lastName ?? ""} ${e.name ?? ""} ${e.email} ${e.employeeId ?? ""}`.toLowerCase();
      return label.includes(q);
    });
  }, [employees, sendSearch]);

  const toggleUser = useCallback((userId: string, checked: boolean) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      for (const e of filteredSendEmployees) {
        if (e.isActive !== false && e.email) next.add(e.id);
      }
      return next;
    });
  }, [filteredSendEmployees]);

  const clearSelection = useCallback(() => setSelectedUserIds(new Set()), []);

  if (isLoading) {
    return (
      <PageWrapper title="Email Templates" subtitle="Manage HR email templates">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Manage reusable email templates for HR communications"
      badge={`${templates?.length ?? 0} templates`}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Template
        </Button>
      }
    >
      <Card className="mb-4 border-dashed">
        <CardContent className="py-3 px-4 space-y-2">
          <p className="text-xs font-medium text-foreground">Merge variables</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            {MERGE_VARIABLES_LINES.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Use double curly braces in subject and body, e.g.{" "}
            <code className="rounded bg-muted px-1">Dear {"{{name}}"}</code>. HTML is supported in
            the body.
          </p>
        </CardContent>
      </Card>

      {!templates?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyState
              illustration={<EmptyMailIllustration className="h-32 w-32 opacity-95" />}
              title="No email templates yet"
              description="Create a reusable template to streamline your HR communications."
              action={{ label: "New Template", onClick: () => setSheetOpen(true) }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t: EmailTemplate) => (
            <Card
              key={t.id}
              className="hover:shadow-sm transition-shadow cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => openSend(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openSend(t);
                }
              }}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-0.5 justify-end" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Send"
                      onClick={() => openSend(t)}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Preview"
                      onClick={() => setPreviewTemplate(t)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Edit"
                      onClick={() => startEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(t)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-tight truncate" title={t.name}>
                    {t.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate" title={t.subject}>
                    Subject: {t.subject}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
                <div className="flex gap-2 flex-wrap">
                  {t.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {t.category}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) resetTemplateForm();
        }}
        title="Create Email Template"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={create.isPending}
      >
        <TemplateFormFields
          name={name}
          setName={setName}
          subject={subject}
          setSubject={setSubject}
          body={body}
          setBody={setBody}
          category={category}
          setCategory={setCategory}
          errors={formErrors}
          customFields={customFields}
        />
      </HrSheet>

      <HrSheet
        open={editSheetOpen}
        onOpenChange={(o) => {
          setEditSheetOpen(o);
          if (!o) {
            setEditingId(null);
            resetTemplateForm();
          }
        }}
        title="Edit Email Template"
        onSubmit={handleEditSubmit}
        submitLabel="Save"
        isPending={update.isPending}
      >
        <TemplateFormFields
          name={name}
          setName={setName}
          subject={subject}
          setSubject={setSubject}
          body={body}
          setBody={setBody}
          category={category}
          setCategory={setCategory}
          errors={formErrors}
          customFields={customFields}
        />
      </HrSheet>

      <Sheet open={previewTemplate !== null} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
        <SheetContent className="sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-base break-words">
              {previewTemplate?.name ?? "Preview"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">Preview with sample data</p>
          </SheetHeader>
          {previewTemplate && (
            <ScrollArea className="flex-1 pr-3">
              {previewTemplate.category && (
                <Badge variant="outline" className="text-[10px] mb-3">
                  {previewTemplate.category}
                </Badge>
              )}
              <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
              <p className="text-sm font-medium mb-3 break-words">
                {mergePreviewText(previewTemplate.subject)}
              </p>
              <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
              <div
                className="text-sm max-w-none border rounded-md p-3 bg-muted/30 break-words [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(mergePreviewText(previewTemplate.body)) }}
              />
            </ScrollArea>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <HrSheet
        open={sendTemplate !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSendTemplate(null);
            setSelectedUserIds(new Set());
            setSendMode("directory");
            setCustomEmailsRaw("");
            setMergeSourceUserId("");
            setSendExtraVars("");
            setTemplateVarValues({});
          }
        }}
        title={`Send: ${sendTemplate?.name ?? ""}`}
        onSubmit={() => void handleSendSubmit()}
        submitLabel={
          sendMode === "directory"
            ? `Send (${selectedUserIds.size})`
            : `Send (${parseEmailList(customEmailsRaw).length})`
        }
        isPending={isSending}
      >

          <Tabs value={sendMode} onValueChange={(v) => setSendMode(v as "directory" | "custom")} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="directory" className="text-xs">
                Org directory
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">
                Custom emails
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directory" className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Sends to each employee&apos;s work email. Profile fields fill{" "}
                <code className="text-[10px] bg-muted px-1 rounded">{"{{name}}"}</code>,{" "}
                <code className="text-[10px] bg-muted px-1 rounded">{"{{employee_name}}"}</code>, etc.
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Search employees…"
                  value={sendSearch}
                  onChange={(e) => setSendSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={selectAllVisible}>
                  Select all visible
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={clearSelection}>
                  Clear
                </Button>
                <span className="text-xs text-muted-foreground self-center ml-auto">
                  {selectedUserIds.size} selected
                </span>
              </div>
              <ScrollArea className="h-[200px] border rounded-md">
                {employeesLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading employees…
                  </div>
                ) : (
                  <ul className="p-2 space-y-1">
                    {filteredSendEmployees.map((e) => {
                      const display =
                        (e.firstName && e.lastName
                          ? `${e.firstName} ${e.lastName}`
                          : e.name) || e.email;
                      return (
                        <li key={e.id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/50">
                          <Checkbox
                            id={`send-${e.id}`}
                            checked={selectedUserIds.has(e.id)}
                            onCheckedChange={(c) => toggleUser(e.id, c === true)}
                            disabled={!e.email}
                          />
                          <label htmlFor={`send-${e.id}`} className="text-xs flex-1 cursor-pointer truncate">
                            <span className="font-medium">{display}</span>
                            <span className="text-muted-foreground block truncate">{e.email}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="custom" className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Send to any addresses (Gmail, personal, external). Optionally pick an employee below to fill name /
                department / etc. into the template; mail still goes to the addresses you list.
              </p>
              <Textarea
                className="text-xs min-h-[80px] font-mono"
                placeholder={"someone@gmail.com\nother@company.com"}
                value={customEmailsRaw}
                onChange={(e) => setCustomEmailsRaw(e.target.value)}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium">Merge fields from employee (optional)</label>
                <Select value={mergeSourceUserId || "__none__"} onValueChange={(v) => setMergeSourceUserId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">
                      None (use only fields below)
                    </SelectItem>
                    {employees.map((e) => {
                      const label =
                        (e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : e.name) || e.email;
                      return (
                        <SelectItem key={e.id} value={e.id} className="text-xs">
                          {label} ({e.email})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {keysNeedingManualInput.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium">Template fields</p>
              <p className="text-[11px] text-muted-foreground">
                Fill placeholders not covered by the employee profile
                {mergeFilledFromEmployeeProfile ? "" : " (custom send: pick “Merge fields from employee” or fill every field below)"}.
                Custom fields use the input type you defined in Settings.
              </p>
              <div className="grid gap-2 max-h-[240px] overflow-y-auto pr-1">
                {keysNeedingManualInput.map((key) => (
                  <TemplateFieldInput
                    key={key}
                    fieldKey={key}
                    value={templateVarValues[key] ?? ""}
                    onChange={(v) => setTemplateVarField(key, v)}
                    customField={customFieldByName.get(key)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Extra variables (optional)</label>
            <Textarea
              className="text-xs font-mono min-h-[56px]"
              placeholder={"One per line: customKey=value"}
              value={sendExtraVars}
              onChange={(e) => setSendExtraVars(e.target.value)}
            />
          </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete Template"
        description="Are you sure you want to delete this email template?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={remove.isPending}
      />
    </PageWrapper>
  );
}

export default function EmailTemplatesPage() {
  return (
    <DashboardGate allowedRoles={["HR", "CEO", "BRANCH_HR"]}>
      <EmailTemplatesContent />
    </DashboardGate>
  );
}
