"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import {
  useOfferLetterTemplates,
  useCreateOfferLetterTemplate,
  useUpdateOfferLetterTemplate,
  useDeleteOfferLetterTemplate,
  useOfferLetterCustomVariables,
  useCreateOfferLetterCustomVariable,
  useUpdateOfferLetterCustomVariable,
  useDeleteOfferLetterCustomVariable,
  type OfferLetterTemplate,
  type OfferLetterCustomVariable,
} from "@/lib/api/hooks/hr/recruitment";
import {
  OFFER_LETTER_TOKEN_LEGEND,
  BUILT_IN_OFFER_TOKEN_KEYS,
  normalizeVariableKey,
  isValidVariableKey,
  resolveCustomVariableToSystemField,
} from "@/lib/hr/offer-letter-tokens";
import { Plus, FileText, Trash2, Pencil, Star, StarOff, ChevronDown, Settings2, FileSignature } from "lucide-react";
import { HR_LETTER_DOCUMENT_TYPES, HR_LETTER_TOKEN_LEGEND, HR_LETTER_DEFAULT_BODIES } from "@/lib/hr/hr-letter-tokens";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const ADMIN_ROLES = new Set(["CEO", "ADMIN"]);

const BUILT_IN_INSERT_ITEMS: { key: string; label: string }[] = [
  { key: "candidateName", label: "Candidate full name" },
  { key: "candidateFirstName", label: "First name" },
  { key: "candidateLastName", label: "Last name" },
  { key: "candidateEmail", label: "Candidate email" },
  { key: "date", label: "Generation date" },
  { key: "designation", label: "Offered designation" },
  { key: "joiningDate", label: "Joining date" },
  { key: "validUntil", label: "Offer expiry date" },
  { key: "annualSalary", label: "Annual CTC" },
  { key: "annualSalaryWords", label: "Annual CTC (words)" },
  { key: "monthlySalary", label: "Monthly CTC" },
  { key: "monthlySalaryWords", label: "Monthly CTC (words)" },
  { key: "orgName", label: "Organisation name" },
  { key: "orgAddress", label: "Organisation address" },
];

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 '\-&/(),.]*$/;
const NAME_MAX = 120;
const NAME_MIN = 3;

function applyPreviewVars(
  text: string,
  customVariables: OfferLetterCustomVariable[] = []
): string {
  const SAMPLE: Record<string, string> = {
    candidateName: "Rahul Verma",
    candidateFirstName: "Rahul",
    candidateLastName: "Verma",
    candidateEmail: "rahul@example.com",
    date: new Date().toLocaleDateString(DEFAULT_LOCALE, { dateStyle: "long" }),
    generationDate: new Date().toLocaleDateString(DEFAULT_LOCALE, { dateStyle: "long" }),
    designation: "Senior Associate",
    joiningDate: "01 July 2026",
    validUntil: "15 June 2026",
    annualSalary: "Rs.12,00,000.00",
    annualSalaryWords: "Twelve Lakh Rupees Only",
    monthlySalary: "Rs.1,00,000.00",
    monthlySalaryWords: "One Lakh Rupees Only",
    orgName: "Miyo Global",
    orgAddress: "123 Business Park, Mumbai, Maharashtra",
  };
  for (const cv of customVariables) {
    if (SAMPLE[cv.variableKey] !== undefined) continue;
    const mapped = resolveCustomVariableToSystemField(cv.variableKey);
    SAMPLE[cv.variableKey] = mapped && SAMPLE[mapped] ? SAMPLE[mapped] : `[${cv.label}]`;
  }
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return SAMPLE[key] ?? `{{${key}}}`;
  });
}

function TemplateFormFields({
  name,
  setName,
  description,
  setDescription,
  body,
  setBody,
  isDefault,
  setIsDefault,
  documentType,
  setDocumentType,
  showSignatureBlock,
  setShowSignatureBlock,
  customVariables,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  isDefault: boolean;
  setIsDefault: (v: boolean) => void;
  documentType: string;
  setDocumentType: (v: string) => void;
  showSignatureBlock: boolean;
  setShowSignatureBlock: (v: boolean) => void;
  customVariables: OfferLetterCustomVariable[];
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [varGuideOpen, setVarGuideOpen] = useState(false);

  const insertToken = useCallback(
    (key: string) => {
      const token = `{{${key}}}`;
      const el = bodyRef.current;
      if (!el) {
        setBody(body + token);
        return;
      }
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const next = body.slice(0, start) + token + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.focus();
        const caret = start + token.length;
        el.setSelectionRange(caret, caret);
      });
    },
    [body, setBody]
  );

  const tokenLegend = documentType !== "OFFER_LETTER"
    ? (HR_LETTER_TOKEN_LEGEND[documentType] ?? [])
    : null;

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Document Type <span className="text-destructive">*</span></label>
        <select
          value={documentType}
          onChange={(e) => {
            setDocumentType(e.target.value);
            const defaultBody = HR_LETTER_DEFAULT_BODIES[e.target.value];
            if (defaultBody && !body.trim()) setBody(defaultBody);
          }}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {HR_LETTER_DOCUMENT_TYPES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {documentType !== "OFFER_LETTER" && (
        <div className="flex items-center gap-2">
          <input
            id="showSigBlock"
            type="checkbox"
            checked={showSignatureBlock}
            onChange={(e) => setShowSignatureBlock(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <label htmlFor="showSigBlock" className="text-sm">
            Add employee signature block at bottom
            <span className="ml-1 text-[10px] text-muted-foreground">(name, ID, designation, signature line)</span>
          </label>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Template Name <span className="text-destructive">*</span></label>
          <span className="text-[10px] text-muted-foreground">{name.length}/{NAME_MAX}</span>
        </div>
        <Input
          placeholder="e.g., Standard Offer Letter"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description (optional)</label>
        <Input
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium">Body</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Insert variable
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-64">
              <DropdownMenuLabel className="text-[11px]">Built-in tokens</DropdownMenuLabel>
              {BUILT_IN_INSERT_ITEMS.map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  onSelect={() => insertToken(item.key)}
                  className="text-xs"
                >
                  <span className="font-mono text-[11px] text-primary mr-2">{`{{${item.key}}}`}</span>
                  <span className="text-muted-foreground truncate">{item.label}</span>
                </DropdownMenuItem>
              ))}
              {customVariables.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px]">Custom variables</DropdownMenuLabel>
                  {customVariables.map((cv) => (
                    <DropdownMenuItem
                      key={cv.id}
                      onSelect={() => insertToken(cv.variableKey)}
                      className="text-xs"
                    >
                      <span className="font-mono text-[11px] text-primary mr-2">{`{{${cv.variableKey}}}`}</span>
                      <span className="text-muted-foreground truncate">{cv.label}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="rounded-md border border-dashed">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setVarGuideOpen((o) => !o)}
          >
            <span>Variable reference</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${varGuideOpen ? "rotate-180" : ""}`} />
          </button>
          {varGuideOpen && (
            <div className="border-t px-3 pb-3 pt-2 space-y-2">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Built-in tokens</p>
                <div className="grid grid-cols-1 gap-0.5">
                  {BUILT_IN_INSERT_ITEMS.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 py-0.5">
                      <span className="font-mono text-[10px] text-primary shrink-0">{`{{${item.key}}}`}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {tokenLegend && tokenLegend.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Available tokens</p>
                  <div className="grid grid-cols-1 gap-0.5">
                    {tokenLegend.map((line, i) => {
                      const [token, ...rest] = line.split(" — ");
                      return (
                        <div key={i} className="flex items-center gap-2 py-0.5">
                          <span className="font-mono text-[10px] text-primary shrink-0">{token}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{rest.join(" — ")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {customVariables.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Custom variables</p>
                  <div className="grid grid-cols-1 gap-0.5">
                    {customVariables.map((cv) => (
                      <div key={cv.id} className="flex items-center gap-2 py-0.5">
                        <span className="font-mono text-[10px] text-primary shrink-0">{`{{${cv.variableKey}}}`}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{cv.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Plain text only. Blank lines = new paragraph. Lines starting with {"- "} or {"* "} render as bullets in the PDF.
              </p>
            </div>
          )}
        </div>
        <Textarea
          ref={bodyRef}
          placeholder={`Dear {{candidateName}},\n\nWe are pleased to offer you the position of {{designation}}...\n\n- Annual CTC: {{annualSalary}} ({{annualSalaryWords}})\n- Joining Date: {{joiningDate}}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="isDefault"
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        <label htmlFor="isDefault" className="text-sm">
          Set as default template
        </label>
      </div>
    </>
  );
}

function CustomVariablesManager() {
  const { data: variables, isLoading } = useOfferLetterCustomVariables();
  const create = useCreateOfferLetterCustomVariable();
  const update = useUpdateOfferLetterCustomVariable();
  const remove = useDeleteOfferLetterCustomVariable();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [variableKey, setVariableKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const keyTouched = useRef(false);

  const list = useMemo(() => variables ?? [], [variables]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setVariableKey("");
    setLabel("");
    setDescription("");
    keyTouched.current = false;
  }, []);

  const onLabelChange = useCallback((v: string) => {
    setLabel(v);
    if (!keyTouched.current && editingId === null) {
      setVariableKey(normalizeVariableKey(v));
    }
  }, [editingId]);

  const startEdit = useCallback((cv: OfferLetterCustomVariable) => {
    setEditingId(cv.id);
    setVariableKey(cv.variableKey);
    setLabel(cv.label);
    setDescription(cv.description ?? "");
    keyTouched.current = true;
  }, []);

  const validate = useCallback((): string | null => {
    const k = variableKey.trim();
    const l = label.trim();
    if (!l) return "Label is required";
    if (!k) return "Variable key is required";
    if (!isValidVariableKey(k)) return "Variable key must start with a letter and contain only letters, numbers, and underscores";
    if (BUILT_IN_OFFER_TOKEN_KEYS.includes(k)) return `"${k}" is a built-in token and cannot be redefined`;
    const dup = list.find((cv) => cv.variableKey.toLowerCase() === k.toLowerCase() && cv.id !== editingId);
    if (dup) return `A variable with key "${k}" already exists`;
    return null;
  }, [variableKey, label, list, editingId]);

  const handleSubmit = useCallback(() => {
    const error = validate();
    if (error) { toast.error(error); return; }
    const payload = {
      variableKey: variableKey.trim(),
      label: label.trim(),
      description: description.trim() || undefined,
    };
    if (editingId === null) {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Variable created"); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    } else {
      update.mutate(
        { id: editingId, ...payload, description: description.trim() || null },
        {
          onSuccess: () => { toast.success("Variable updated"); resetForm(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    }
  }, [validate, variableKey, label, description, editingId, create, update, resetForm]);

  const handleDelete = useCallback(() => {
    if (deleteId === null) return;
    remove.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Variable deleted");
        setDeleteId(null);
        if (editingId === deleteId) resetForm();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, remove, editingId, resetForm]);

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-md border p-3">
        <p className="text-xs font-medium">
          {editingId === null ? "Add custom variable" : "Edit custom variable"}
        </p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Label <span className="text-destructive">*</span></label>
          <Input
            placeholder="e.g., Reporting Manager"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Variable key <span className="text-destructive">*</span></label>
          <Input
            placeholder="e.g., reporting_manager"
            value={variableKey}
            onChange={(e) => { keyTouched.current = true; setVariableKey(e.target.value); }}
            maxLength={64}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Inserted as <span className="font-mono">{`{{${variableKey || "key"}}}`}</span>.
            {resolveCustomVariableToSystemField(variableKey)
              ? " Matches a system field — auto-filled at generation."
              : " No system match — a labelled placeholder is inserted at generation for manual editing."}
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description (optional)</label>
          <Input
            placeholder="What this variable represents"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={create.isPending || update.isPending}
          >
            {editingId === null ? "Add" : "Save"}
          </Button>
          {editingId !== null && (
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {list.length} variable{list.length === 1 ? "" : "s"}
        </p>
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : list.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No custom variables yet.</p>
        ) : (
          <ScrollArea className="max-h-[40vh]">
            <div className="space-y-2 pr-2">
              {list.map((cv) => (
                <div key={cv.id} className="flex items-start justify-between gap-2 rounded-md border p-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-primary truncate">{`{{${cv.variableKey}}}`}</p>
                    <p className="text-sm font-medium leading-tight truncate">{cv.label}</p>
                    {cv.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{cv.description}</p>
                    )}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => startEdit(cv)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => setDeleteId(cv.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Variable"
        description="Delete this custom variable? Templates that reference it will keep the literal token text until edited."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={remove.isPending}
      />
    </div>
  );
}

function OfferLetterTemplatesContent() {
  const { data: session } = useSession();
  const isAdmin = ADMIN_ROLES.has(session?.user?.role ?? "");

  const { data: templates, isLoading } = useOfferLetterTemplates();
  const create = useCreateOfferLetterTemplate();
  const update = useUpdateOfferLetterTemplate();
  const remove = useDeleteOfferLetterTemplate();

  const { data: customVariables } = useOfferLetterCustomVariables();
  const customVars = useMemo(() => customVariables ?? [], [customVariables]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [documentType, setDocumentType] = useState("OFFER_LETTER");
  const [showSignatureBlock, setShowSignatureBlock] = useState(false);
  const [defaultConfirmId, setDefaultConfirmId] = useState<number | null>(null);
  const [unsetDefaultConfirmId, setUnsetDefaultConfirmId] = useState<number | null>(null);

  const hasExistingDefault = useMemo(
    () => (templates ?? []).some((t) => t.isDefault),
    [templates]
  );

  const validateName = useCallback((n: string, excludeId?: number): string | null => {
    const t = n.trim();
    if (!t) return "Template Name is required";
    if (t.length < NAME_MIN) return `Template Name must be at least ${NAME_MIN} characters`;
    if (t.length > NAME_MAX) return `Template Name must be ${NAME_MAX} characters or less`;
    if (!NAME_RE.test(t)) return "Template Name must start with a letter or number and contain only letters, numbers, spaces, and basic punctuation";
    const duplicate = templates?.find((tpl) => tpl.name.trim().toLowerCase() === t.toLowerCase() && tpl.id !== excludeId);
    if (duplicate) return `A template named "${duplicate.name}" already exists`;
    return null;
  }, [templates]);

  const resetForm = useCallback(() => {
    setName(""); setDescription(""); setBody(""); setIsDefault(false);
    setDocumentType("OFFER_LETTER"); setShowSignatureBlock(false);
  }, []);

  const handleCreate = useCallback(() => {
    const nameError = validateName(name);
    if (nameError) { toast.error(nameError); return; }
    if (!body.trim()) { toast.error("Body is required"); return; }
    create.mutate(
      { name: name.trim(), body: body.trim(), description: description.trim() || undefined, isDefault, documentType, showSignatureBlock },
      {
        onSuccess: () => {
          toast.success("Template created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [name, body, description, isDefault, create, resetForm, validateName]);

  const startEdit = useCallback((t: OfferLetterTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description ?? "");
    setBody(t.body);
    setIsDefault(t.isDefault);
    setDocumentType(t.documentType ?? "OFFER_LETTER");
    setShowSignatureBlock(t.showSignatureBlock ?? false);
    setEditSheetOpen(true);
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (editingId === null) return;
    const nameError = validateName(name, editingId);
    if (nameError) { toast.error(nameError); return; }
    if (!body.trim()) { toast.error("Body is required"); return; }
    update.mutate(
      { id: editingId, name: name.trim(), body: body.trim(), description: description.trim() || undefined, isDefault, documentType, showSignatureBlock },
      {
        onSuccess: () => {
          toast.success("Template updated");
          setEditSheetOpen(false);
          setEditingId(null);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [editingId, name, body, description, isDefault, update, resetForm, validateName]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    remove.mutate(deleteId, {
      onSuccess: () => { toast.success("Template deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, remove]);

  const handleSetDefault = useCallback((t: OfferLetterTemplate) => {
    setDefaultConfirmId(t.id);
  }, []);

  const handleConfirmSetDefault = useCallback(() => {
    if (!defaultConfirmId) return;
    update.mutate(
      { id: defaultConfirmId, isDefault: true },
      {
        onSuccess: () => { toast.success("Default template updated"); setDefaultConfirmId(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [defaultConfirmId, update]);

  const handleUnsetDefault = useCallback((t: OfferLetterTemplate) => {
    setUnsetDefaultConfirmId(t.id);
  }, []);

  const handleConfirmUnsetDefault = useCallback(() => {
    if (!unsetDefaultConfirmId) return;
    update.mutate(
      { id: unsetDefaultConfirmId, isDefault: false },
      {
        onSuccess: () => { toast.success("Default status removed"); setUnsetDefaultConfirmId(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [unsetDefaultConfirmId, update]);

  const previewTemplate = useMemo(
    () => templates?.find((t) => t.id === previewId) ?? null,
    [templates, previewId]
  );

  if (isLoading) {
    return (
      <PageWrapper title="Offer Letter Templates" subtitle="Manage offer letter templates">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Offer Letter Templates"
      subtitle="Create reusable templates with merge tokens for branded PDF offer letters"
      badge={`${templates?.length ?? 0} templates`}
      actions={
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
              <Settings2 className="h-3.5 w-3.5 mr-1" />
              Manage variables
            </Button>
          )}
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Template
          </Button>
        </div>
      }
    >
      <Card className="mb-4 border-dashed">
        <CardContent className="py-3 px-4 space-y-2">
          <p className="text-xs font-medium text-foreground">Merge tokens</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
            {OFFER_LETTER_TOKEN_LEGEND.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {customVars.length > 0 && (
            <>
              <p className="text-xs font-medium text-foreground pt-1">Custom variables</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                {customVars.map((cv) => {
                  const mapped = resolveCustomVariableToSystemField(cv.variableKey);
                  return (
                    <li key={cv.id}>
                      <span className="font-mono">{`{{${cv.variableKey}}}`}</span> — {cv.label}
                      {cv.description ? `: ${cv.description}` : ""}
                      {mapped ? (
                        <span className="text-emerald-600"> (auto-filled)</span>
                      ) : (
                        <span className="text-amber-600"> (manual placeholder)</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <p className="text-[11px] text-muted-foreground">
            All other content (reporting manager, probation, notice, signatory, leaves) is free text you write directly into the body.
          </p>
        </CardContent>
      </Card>

      {!templates?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No offer letter templates yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    {t.isDefault && (
                      <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {t.isDefault ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-500"
                        title="Remove default status"
                        onClick={() => handleUnsetDefault(t)}
                      >
                        <StarOff className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Set as default"
                        onClick={() => handleSetDefault(t)}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Preview"
                      onClick={() => setPreviewId(t.id)}
                    >
                      <FileText className="h-3.5 w-3.5" />
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
                <div>
                  <h3 className="text-sm font-semibold leading-tight truncate" title={t.name}>{t.name}</h3>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{t.body}</p>
                <div className="flex flex-wrap gap-1">
                  {t.isDefault && (
                    <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">
                      Default
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {HR_LETTER_DOCUMENT_TYPES.find((d) => d.value === (t.documentType ?? "OFFER_LETTER"))?.label ?? t.documentType}
                  </Badge>
                  {t.showSignatureBlock && (
                    <Badge variant="outline" className="text-[10px]">Sig block</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(o) => { setSheetOpen(o); if (!o) resetForm(); }}
        title="Create Offer Letter Template"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={create.isPending}
      >
        <TemplateFormFields
          name={name} setName={setName}
          description={description} setDescription={setDescription}
          body={body} setBody={setBody}
          isDefault={isDefault} setIsDefault={setIsDefault}
          documentType={documentType} setDocumentType={setDocumentType}
          showSignatureBlock={showSignatureBlock} setShowSignatureBlock={setShowSignatureBlock}
          customVariables={customVars}
        />
      </HrSheet>

      <HrSheet
        open={editSheetOpen}
        onOpenChange={(o) => {
          setEditSheetOpen(o);
          if (!o) { setEditingId(null); resetForm(); }
        }}
        title="Edit Offer Letter Template"
        onSubmit={handleEditSubmit}
        submitLabel="Save"
        isPending={update.isPending}
      >
        <TemplateFormFields
          name={name} setName={setName}
          description={description} setDescription={setDescription}
          body={body} setBody={setBody}
          isDefault={isDefault} setIsDefault={setIsDefault}
          documentType={documentType} setDocumentType={setDocumentType}
          showSignatureBlock={showSignatureBlock} setShowSignatureBlock={setShowSignatureBlock}
          customVariables={customVars}
        />
      </HrSheet>

      <HrSheet
        open={previewTemplate !== null}
        onOpenChange={(o) => { if (!o) setPreviewId(null); }}
        title={`Preview: ${previewTemplate?.name ?? ""}`}
        showSubmit={false}
        cancelLabel="Close"
      >
        {previewTemplate && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Sample data substituted — rendered with placeholder values.
            </p>
            <ScrollArea className="h-[60vh] border rounded-md p-3 bg-muted/30">
              <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">
                {applyPreviewVars(previewTemplate.body, customVars)}
              </pre>
            </ScrollArea>
          </div>
        )}
      </HrSheet>

      {isAdmin && (
        <HrSheet
          open={manageOpen}
          onOpenChange={setManageOpen}
          title="Manage Custom Variables"
          description="Define reusable tokens for offer letter templates. Keys matching system fields auto-fill; others insert a labelled placeholder at generation."
          showSubmit={false}
          cancelLabel="Close"
        >
          <CustomVariablesManager />
        </HrSheet>
      )}

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Template"
        description="Are you sure you want to delete this offer letter template?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={remove.isPending}
      />

      <ConfirmActionDialog
        open={defaultConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDefaultConfirmId(null); }}
        title="Set as Default Template"
        description={
          hasExistingDefault
            ? "This will replace the current default offer letter template. Are you sure?"
            : "This will become the default offer letter template, used automatically when generating offer letters. Are you sure?"
        }
        confirmLabel="Set Default"
        variant="default"
        onConfirm={handleConfirmSetDefault}
        isPending={update.isPending}
      />

      <ConfirmActionDialog
        open={unsetDefaultConfirmId !== null}
        onOpenChange={(open) => { if (!open) setUnsetDefaultConfirmId(null); }}
        title="Remove Default Status"
        description="This template will no longer be the default. Offer letter generation will have no default template until you set another one. Are you sure?"
        confirmLabel="Remove Default"
        variant="default"
        onConfirm={handleConfirmUnsetDefault}
        isPending={update.isPending}
      />
    </PageWrapper>
  );
}

export default function OfferLetterTemplatesPage() {
  return (
    <DashboardGate allowedRoles={["HR", "CEO", "BRANCH_HR"]}>
      <OfferLetterTemplatesContent />
    </DashboardGate>
  );
}
