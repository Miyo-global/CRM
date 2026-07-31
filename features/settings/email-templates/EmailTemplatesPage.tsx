"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { sanitizeHtml } from "@/lib/sanitize";
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
import { TEMPLATE_REGISTRY, CATEGORIES } from "./registry";
import type { EmailTemplateConfig } from "./types";


function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </svg>
  );
}

interface CategoryTabProps {
  cat: string;
}
const CategoryTab = memo(function CategoryTab({ cat }: CategoryTabProps) {
  return (
    <TabsTrigger key={cat} value={cat} className="text-xs">
      {cat}
    </TabsTrigger>
  );
});

interface TemplateSelectItemProps {
  template: EmailTemplateConfig;
}
const TemplateSelectItem = memo(function TemplateSelectItem({
  template,
}: TemplateSelectItemProps) {
  return (
    <SelectItem key={template.id} value={template.id} className="text-sm">
      {template.name}
    </SelectItem>
  );
});

interface PreviewSubjectBarProps {
  subject: string;
}
const PreviewSubjectBar = memo(function PreviewSubjectBar({
  subject,
}: PreviewSubjectBarProps) {
  return (
    <div className="border-b px-4 py-2.5 bg-muted/40 flex items-center gap-2">
      <Label className="text-xs text-muted-foreground shrink-0">Subject</Label>
      <span className="text-xs font-medium text-foreground truncate">{subject}</span>
    </div>
  );
});

interface PreviewPanelProps {
  preview: { subject: string; html: string } | null;
}
const PreviewPanel = memo(function PreviewPanel({ preview }: PreviewPanelProps) {
  if (!preview) {
    return (
      <Card className="shadow-noir">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <MailIcon className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Select a template to preview it here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-noir overflow-hidden">
      <CardContent className="p-0">
        <PreviewSubjectBar subject={preview.subject} />
        <div
          className="bg-white rounded-b-lg"
          style={{ minHeight: "500px" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview.html) }}
        />
      </CardContent>
    </Card>
  );
});

interface SendTestActionsProps {
  testEmail: string;
  onTestEmailChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  hasTemplate: boolean;
}
const SendTestActions = memo(function SendTestActions({
  testEmail,
  onTestEmailChange,
  onSend,
  sending,
  hasTemplate,
}: SendTestActionsProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onTestEmailChange(e.target.value),
    [onTestEmailChange]
  );

  return (
    <div className="flex items-center gap-2">
      <Input
        type="email"
        placeholder="your@email.com"
        className="h-8 w-52 text-sm"
        value={testEmail}
        onChange={handleChange}
        aria-label="Test email address"
      />
      <Button
        size="sm"
        onClick={onSend}
        disabled={sending || !hasTemplate || !testEmail.trim()}
      >
        <SendIcon className="h-3.5 w-3.5 mr-1.5" />
        {sending ? "Sending…" : "Send Test"}
      </Button>
    </div>
  );
});


export default function EmailTemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const categoryTemplates = useMemo(
    () => TEMPLATE_REGISTRY.filter((t) => t.category === activeCategory),
    [activeCategory]
  );

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
    const first = TEMPLATE_REGISTRY.find((t) => t.category === cat);
    setSelectedId(first?.id ?? "");
  }, []);

  const selectedTemplate = useMemo(
    () =>
      TEMPLATE_REGISTRY.find((t) => t.id === selectedId) ??
      categoryTemplates[0] ??
      null,
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
      title="Email Templates"
      subtitle="Preview and test all transactional email templates used in the system"
      actions={
        <SendTestActions
          testEmail={testEmail}
          onTestEmailChange={setTestEmail}
          onSend={handleSendTest}
          sending={sending}
          hasTemplate={!!selectedTemplate}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
          <TabsList className="flex-wrap h-auto gap-1">
            {CATEGORIES.map((cat) => (
              <CategoryTab key={cat} cat={cat} />
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={selectedTemplate?.id ?? ""}
            onValueChange={setSelectedId}
          >
            <SelectTrigger className="w-72 h-8 text-sm" aria-label="Select template">
              <SelectValue placeholder="Select a template…" />
            </SelectTrigger>
            <SelectContent>
              {categoryTemplates.map((t) => (
                <TemplateSelectItem key={t.id} template={t} />
              ))}
            </SelectContent>
          </Select>

          {preview && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MailIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">Subject:</span>
              <span className="truncate max-w-[420px]">{preview.subject}</span>
            </div>
          )}
        </div>

        <PreviewPanel preview={preview} />
      </div>
    </PageWrapper>
  );
}
