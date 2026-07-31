"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Eye, EyeOff, Wand2, History } from "lucide-react";
import Link from "next/link";
import { sanitizeHtml } from "@/lib/sanitize";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
  useDocumentTemplateVersions,
  type DocumentTemplate,
} from "@/lib/api/hooks/hr/document-templates";
import {
  extractVariables,
  substituteVariables,
  mergeVariableDefaults,
} from "@/lib/utils/document-variables";
import { getErrorMessage } from "@/lib/get-error-message";
import { richDocumentTitleSchema } from "@/lib/validations/hr-documents";
import { OrgVariablesPanel } from "@/features/hr/documents/org-variables-panel";
import { useOrgDocumentVariables } from "@/lib/api/hooks/hr/org-document-variables";


const TEMPLATE_TYPES = [
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "NDA", label: "Non-Disclosure Agreement (NDA)" },
  { value: "POLICY", label: "Company Policy" },
  { value: "WELCOME", label: "Welcome Letter" },
  { value: "OTHER", label: "Other" },
] as const;


const COMMON_TOKENS = [
  "Candidate_Name",
  "Job_Title",
  "Salary",
  "Start_Date",
  "Company_Name",
  "Manager_Name",
  "Department",
  "Location",
  "Probation_Period",
  "Reporting_To",
] as const;


const SAMPLE_VARS: Record<string, string> = {
  Candidate_Name: "John Doe",
  Job_Title: "Senior Engineer",
  Salary: "₹12,00,000 p.a.",
  Start_Date: "May 1, 2026",
  Company_Name: "Miyo Global",
  Manager_Name: "Priya Sharma",
  Department: "Engineering",
  Location: "Mumbai, India",
  Probation_Period: "3 months",
  Reporting_To: "Priya Sharma",
};


const DEFAULT_HTML: Record<string, string> = {
  OFFER_LETTER: `<h1>Offer Letter</h1>
<p>Dear {{Candidate_Name}},</p>
<p>We are pleased to offer you the position of <strong>{{Job_Title}}</strong> at <strong>{{Company_Name}}</strong>.</p>
<h2>Compensation &amp; Benefits</h2>
<ul>
  <li>Base Salary: {{Salary}} per annum</li>
  <li>Start Date: {{Start_Date}}</li>
  <li>Probation Period: {{Probation_Period}}</li>
  <li>Reporting To: {{Reporting_To}}</li>
</ul>
<p>Please sign and return this letter by <em>[Acceptance Deadline]</em>.</p>
<p>Sincerely,<br/>{{Manager_Name}}<br/>{{Company_Name}}</p>`,

  NDA: `<h1>Non-Disclosure Agreement</h1>
<p>This agreement is entered into between <strong>{{Company_Name}}</strong> and <strong>{{Candidate_Name}}</strong> effective {{Start_Date}}.</p>
<h2>1. Confidential Information</h2>
<p>...</p>
<h2>2. Obligations</h2>
<p>...</p>
<p>Signed,<br/>{{Candidate_Name}}</p>`,

  POLICY: `<h1>Company Policy: [Policy Name]</h1>
<h2>1. Purpose</h2>
<p>This policy outlines the guidelines for all employees of <strong>{{Company_Name}}</strong>.</p>
<h2>2. Scope</h2>
<p>Applies to all staff in the <strong>{{Department}}</strong> department.</p>
<h2>3. Policy Details</h2>
<p>...</p>`,

  WELCOME: `<h1>Welcome to {{Company_Name}}!</h1>
<p>Dear {{Candidate_Name}},</p>
<p>We are thrilled to have you join us as <strong>{{Job_Title}}</strong> starting <strong>{{Start_Date}}</strong>.</p>
<p>Your manager <strong>{{Manager_Name}}</strong> will be in touch to help you get started.</p>
<p>Best regards,<br/>HR Team, {{Company_Name}}</p>`,

  OTHER: `<h1>Document Title</h1>
<p>Dear {{Candidate_Name}},</p>
<p>...</p>`,
};


interface TemplateEditorProps {
  
  template?: DocumentTemplate;
}


export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const isEdit = !!template;

  const [title, setTitle] = useState(template?.title ?? "");
  const [type, setType] = useState(template?.type ?? "OFFER_LETTER");
  const [htmlContent, setHtmlContent] = useState(
    template?.htmlContent ?? DEFAULT_HTML.OFFER_LETTER
  );
  const [showPreview, setShowPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createMutation = useCreateDocumentTemplate();
  const updateMutation = useUpdateDocumentTemplate();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const { data: versionHistory } = useDocumentTemplateVersions(template?.id ?? 0);
  const { data: orgVariables = [] } = useOrgDocumentVariables();

  const detectedVariables = useMemo(() => extractVariables(htmlContent), [htmlContent]);

  const previewVars = useMemo(
    () => mergeVariableDefaults(SAMPLE_VARS, orgVariables),
    [orgVariables],
  );

  const previewHtml = useMemo(() => {
    const { result } = substituteVariables(htmlContent, previewVars);
    return result;
  }, [htmlContent, previewVars]);

  useEffect(() => {
    if (template) {
      setTitle(template.title ?? "");
      setType(template.type ?? "OFFER_LETTER");
      setHtmlContent(template.htmlContent ?? DEFAULT_HTML.OFFER_LETTER);
    }
  }, [template?.id]);

  const prevTypeRef = useRef(type);
  useEffect(() => {
    if (!isEdit && prevTypeRef.current !== type) {
      const prev = DEFAULT_HTML[prevTypeRef.current];
      if (htmlContent === prev) {
        setHtmlContent(DEFAULT_HTML[type] ?? DEFAULT_HTML.OTHER);
      }
      prevTypeRef.current = type;
    }
  }, [type, isEdit, htmlContent]);

  const insertToken = useCallback((token: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? htmlContent.length;
    const end = el.selectionEnd ?? start;
    const tokenStr = `{{${token}}}`;
    const newContent =
      htmlContent.slice(0, start) + tokenStr + htmlContent.slice(end);
    setHtmlContent(newContent);

    requestAnimationFrame(() => {
      el.focus();
      const pos = start + tokenStr.length;
      el.setSelectionRange(pos, pos);
    });
  }, [htmlContent]);

  const handleVariableDeleted = useCallback((slug: string) => {
    const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    setHtmlContent((prev) => {
      const next = prev.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g"), "");
      if (next === prev) return prev;
      toast.info(`Removed {{${slug}}} occurrences from this template.`);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    const parsed = richDocumentTitleSchema.safeParse(title);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid title");
      return;
    }
    const normalisedTitle = parsed.data;

    const payload = {
      title: normalisedTitle,
      type,
      htmlContent,
      variables: detectedVariables,
    };

    if (isEdit && template) {
      updateMutation.mutate(
        { id: template.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Template updated");
            router.push("/hr/documents/templates");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Template created");
          router.push("/hr/documents/templates");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [title, type, htmlContent, detectedVariables, isEdit, template, updateMutation, createMutation, router]);

  return (
    <PageWrapper
      title={isEdit ? `Edit Template` : "New Template"}
      subtitle={
        isEdit
          ? `Editing "${template.title}" — v${template.version}`
          : "Create a reusable HTML document template with variable tokens."
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/documents/templates">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            className="gap-2"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Preview
              </>
            )}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                {isEdit ? "Save Changes" : "Create Template"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div
        className={`grid gap-6 ${
          showPreview ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-3xl mx-auto"
        }`}
      >
        <div className="space-y-6 pb-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Template Details</CardTitle>
              <CardDescription>Choose a type first, then name your template.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div className="space-y-1.5">
                <Label htmlFor="tmpl-type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="tmpl-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tmpl-title">Title</Label>
                <Input
                  id="tmpl-title"
                  placeholder="e.g. Software Engineer Offer Letter"
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus={isEdit}
                />
                <p className="text-[10px] text-muted-foreground text-right">{title.trim().length}/200</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Variable Tokens</CardTitle>
              <CardDescription>
                Click a token to insert it at your cursor in the editor below.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TOKENS.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertToken(token)}
                    className="inline-flex items-center px-2 py-1 rounded text-[11px] font-mono bg-muted hover:bg-muted/80 border border-border/60 text-foreground transition-colors cursor-pointer"
                    title={`Insert {{${token}}}`}
                  >
                    {`{{${token}}}`}
                  </button>
                ))}
              </div>

              {detectedVariables.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                      Detected in content
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {detectedVariables.map((v) => (
                        <Badge
                          key={v}
                          variant="outline"
                          className="text-[10px] font-mono px-1.5 bg-blue/5 border-blue/20 text-blue"
                        >
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <OrgVariablesPanel onInsertToken={insertToken} onVariableDeleted={handleVariableDeleted} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">HTML Content</CardTitle>
              <CardDescription>
                Write raw HTML. Use <code className="text-[11px]">{"{{Variable_Name}}"}</code> tokens
                as placeholders.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <Textarea
                ref={textareaRef}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="font-mono text-xs min-h-[420px] resize-y"
                placeholder="<h1>Hello {{Candidate_Name}}</h1>..."
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {isEdit && versionHistory && versionHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Version History
                </CardTitle>
                <CardDescription>Previous saved versions of this template.</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {versionHistory.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">v{v.version} — {v.title}</p>
                        <p className="text-muted-foreground truncate">{v.type}</p>
                      </div>
                      <div className="ml-3 shrink-0 text-muted-foreground">
                        {v.archivedAt ? new Date(v.archivedAt).toLocaleDateString() : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {showPreview && (
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Live Preview
                </CardTitle>
                <CardDescription>
                  Rendered with sample data. Tokens without a sample value remain as-is.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div
                  className="max-h-[600px] overflow-y-auto rounded-md border bg-white dark:bg-neutral-950 p-5 text-sm prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
