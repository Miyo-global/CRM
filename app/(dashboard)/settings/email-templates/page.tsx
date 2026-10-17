"use client";

import { useState, useMemo, useCallback } from "react";
import { Mail, Send } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { sanitizeHtml } from "@/lib/sanitize";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyState } from "@/components/ui/empty-state";

import { EMAIL_CATALOG, type EmailTemplateId } from "@/lib/email-templates/catalog.generated";
import { renderEmail } from "@/lib/email-templates/render";
import { sampleVarsFor } from "@/lib/email-templates/sample-vars";

/** Category shown for each template-id prefix. */
const TEMPLATE_CATEGORY_LABEL: Record<string, string> = {
  asset: "Assets",
  ats: "Hiring",
  attendance: "Attendance",
  auth: "Auth",
  bonus: "Payroll",
  calendar: "Calendar",
  celebration: "Celebrations",
  company: "Organization",
  data: "Exports",
  document: "Documents",
  exit: "Exit",
  expense: "Expenses",
  helpdesk: "Support",
  holiday: "Holidays",
  leave: "Leave",
  onboarding: "Onboarding",
  one: "Meetings",
  payroll: "Payroll",
  perf: "Performance",
  project: "Projects",
  recognition: "Recognition",
  support: "Support",
  task: "Tasks",
  ticket: "Projects",
  weekly: "Reports",
  wfh: "Leave",
  worklog: "Work logs",
};

interface EmailTemplateConfig {
  id: string;
  category: string;
  name: string;
  generate: () => { subject: string; html: string };
}

/**
 * MIYO-0155: the 91 hand-written templates, listed from the catalog so this
 * page shows, and tests, exactly what production sends.
 */
const CATALOG_TEMPLATES: EmailTemplateConfig[] = (
  Object.keys(EMAIL_CATALOG) as EmailTemplateId[]
).map((id) => ({
  id,
  category: TEMPLATE_CATEGORY_LABEL[id.split("-")[0]] ?? "Other",
  name: id,
  generate: () => {
    const { subject, html } = renderEmail(id, sampleVarsFor(id));
    return { subject, html };
  },
}));

const ALL_TEMPLATES: EmailTemplateConfig[] = CATALOG_TEMPLATES;

const CATEGORIES = Array.from(new Set(ALL_TEMPLATES.map((t) => t.category)));

export default function EmailTemplatesPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <EmailTemplatesContent />
    </DashboardGate>
  );
}

function EmailTemplatesContent() {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const categoryTemplates = useMemo(
    () => ALL_TEMPLATES.filter((t) => t.category === activeCategory),
    [activeCategory]
  );

  const handleCategoryChange = useCallback(
    (cat: string) => {
      setActiveCategory(cat);
      const first = ALL_TEMPLATES.find((t) => t.category === cat);
      setSelectedId(first?.id ?? "");
    },
    []
  );

  const selectedTemplate = useMemo(
    () => ALL_TEMPLATES.find((t) => t.id === selectedId) ?? categoryTemplates[0] ?? null,
    [selectedId, categoryTemplates]
  );

  const preview = useMemo(() => {
    if (!selectedTemplate) return null;
    try {
      return selectedTemplate.generate();
    } catch {
      return null;
    }
  }, [selectedTemplate]);

  const handleSendTest = useCallback(async () => {
    if (!selectedTemplate || !testEmail.trim()) {
      toast.error("Select a template and enter a test email address");
      return;
    }
    setSending(true);
    try {
      await apiClient.post("/settings/email-templates/test", {
        templateId: selectedTemplate.id,
        testEmail: testEmail.trim(),
      });
      toast.success(`Test email sent to ${testEmail}`);
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setSending(false);
    }
  }, [selectedTemplate, testEmail]);

  return (
    <PageWrapper
      title="Email templates"
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            type="email"
            placeholder="your@email.com"
            className="h-8 min-w-0 flex-1 sm:w-52 sm:flex-none"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            aria-label="Test email address"
          />
          <Button
            size="sm"
            onClick={handleSendTest}
            disabled={sending || !selectedTemplate || !testEmail.trim()}
            loading={sending}
          >
            {!sending && <Send aria-hidden />}
            {sending ? "Sending…" : "Send Test"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="-mx-1 overflow-x-auto px-1">
          <TabsList variant="underline">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={selectedTemplate?.id ?? ""}
            onValueChange={setSelectedId}
          >
            <SelectTrigger className="h-8 w-full sm:w-72" aria-label="Select template">
              <SelectValue placeholder="Select a template…" />
            </SelectTrigger>
            <SelectContent>
              {categoryTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-sm">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {preview && (
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              <span className="font-medium text-foreground">Subject:</span>
              <span className="truncate max-w-md" title={preview.subject}>{preview.subject}</span>
            </div>
          )}
        </div>

        {preview ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b border-border px-4 py-2.5 bg-surface-sunken flex items-center gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Subject</Label>
                <span className="text-xs font-medium text-foreground truncate">
                  {preview.subject}
                </span>
              </div>

              <div
                className="bg-card rounded-b-lg"
                style={{ minHeight: "500px" }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview.html) }}
              />
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            title="Select a template to preview it here"
          />
        )}
      </div>
    </PageWrapper>
  );
}
