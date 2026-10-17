"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface AtsTemplateRow {
  templateId: string;
  defaultSubject: string;
  subject: string | null;
  body: string | null;
  placeholders: string[];
}

/** MIYO-0673: reword one mail, or put it back as it was. */
function TemplateCard({ template }: { template: AtsTemplateRow }) {
  const router = useRouter();
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body ?? "");
  const [busy, setBusy] = useState(false);

  async function save(reset: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/ats/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.templateId,
          subject: reset ? undefined : subject.trim() || undefined,
          body: reset ? undefined : body.trim() || undefined,
          reset,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload?.error ?? "Could not save the wording.");
        return;
      }
      if (reset) {
        setSubject("");
        setBody("");
      }
      toast.success(reset ? "Back to the standard wording." : "Saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <div>
          <p className="font-medium text-foreground">{template.templateId}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Standard subject: {template.defaultSubject}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${template.templateId}-subject`}>Subject</Label>
          <Input
            id={`${template.templateId}-subject`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Leave empty to use the standard subject"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${template.templateId}-body`}>Body</Label>
          <Textarea
            id={`${template.templateId}-body`}
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave empty to use the standard wording"
          />
          <p className="text-xs text-muted-foreground">
            Markdown: **bold**, *italics* and [links](https://example.com). Placeholders:{" "}
            {template.placeholders.map((p) => `{{${p}}}`).join(", ")}
          </p>
        </div>

        <div className="flex gap-3">
          <Button disabled={busy} onClick={() => void save(false)}>
            Save
          </Button>
          {(template.subject || template.body) && (
            <Button variant="outline" disabled={busy} onClick={() => void save(true)}>
              Use the standard wording
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmailTemplateEditor({ templates }: { templates: AtsTemplateRow[] }) {
  return (
    <div className="grid max-w-2xl gap-4">
      {templates.map((template) => (
        <TemplateCard key={template.templateId} template={template} />
      ))}
    </div>
  );
}
