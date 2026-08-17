"use client";

import { useState, useCallback } from "react";
import { CalendarCheck, Sparkles, Copy, CheckCheck, Loader2, Download, RotateCcw, User, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useMeetingPrep, type MeetingPrepResult } from "@/lib/api/hooks/ai";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";



function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [text]);

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} aria-label="Copy brief to clipboard">
      {copied ? (
        <CheckCheck className="h-4 w-4 mr-2 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 mr-2" />
      )}
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}



interface FormState {
  meetingTitle: string;
  attendeeType: "lead" | "client";
  attendeeId: string;
  scheduledAt: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  meetingTitle: "",
  attendeeType: "lead",
  attendeeId: "",
  scheduledAt: "",
  notes: "",
};



interface ResultDisplayProps {
  result: MeetingPrepResult;
  meetingTitle: string;
  scheduledAt: string;
  onPrepareAnother: () => void;
}

function ResultDisplay({ result, meetingTitle, scheduledAt, onPrepareAnother }: ResultDisplayProps) {
  const formattedDate = scheduledAt
    ? new Date(scheduledAt).toLocaleString(DEFAULT_LOCALE, {
        dateStyle: "full",
        timeStyle: "short",
      })
    : "Not specified";

  const generatedAt = new Date(result.generatedAt).toLocaleString(DEFAULT_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const handleDownload = useCallback(() => {
    const content = `MEETING PREP BRIEF
==================
Meeting: ${meetingTitle}
Attendee: ${result.attendeeName}
Scheduled: ${formattedDate}
Generated: ${generatedAt}

${result.brief}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-brief-${meetingTitle.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, meetingTitle, formattedDate, generatedAt]);

  const paragraphs = result.brief.split(/\n{2,}/).filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">Meeting Brief: {meetingTitle}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {result.attendeeName}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Generated at {generatedAt}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
            <CopyButton text={result.brief} />
            <Button variant="outline" size="sm" onClick={handleDownload} aria-label="Download brief as text file">
              <Download className="h-4 w-4 mr-2" />
              Download .txt
            </Button>
            <Button variant="ghost" size="sm" onClick={onPrepareAnother} aria-label="Prepare another meeting brief">
              <RotateCcw className="h-4 w-4 mr-2" />
              Prepare Another
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {paragraphs.map((para, i) => {
            const lines = para.split("\n");
            return (
              <div key={i} className="space-y-1">
                {lines.map((line, j) => {
                  const isHeader =
                    /^\d+\.\s/.test(line) ||
                    (line.endsWith(":") && line.length < 80) ||
                    /^[A-Z][A-Z\s&]+:/.test(line) ||
                    /^#{1,3}\s/.test(line);
                  if (isHeader) {
                    return (
                      <p key={j} className="font-semibold text-sm text-foreground pt-2 first:pt-0">
                        {line.replace(/^#{1,3}\s/, "")}
                      </p>
                    );
                  }
                  const isBullet = /^[-•*]\s/.test(line);
                  if (isBullet) {
                    return (
                      <div key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span className="leading-relaxed">{line.replace(/^[-•*]\s/, "")}</span>
                      </div>
                    );
                  }
                  return (
                    <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                      {line}
                    </p>
                  );
                })}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}



export default function MeetingPrepPage() {
  const { mutateAsync: generateBrief, isPending } = useMeetingPrep();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<MeetingPrepResult | null>(null);
  const [lastForm, setLastForm] = useState<FormState>(INITIAL_FORM);

  const isValid =
    form.meetingTitle.trim().length > 0 &&
    form.attendeeId.trim().length > 0 &&
    form.scheduledAt.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    try {
      const data = await generateBrief({
        meetingTitle: form.meetingTitle.trim(),
        attendeeType: form.attendeeType,
        attendeeId: Number(form.attendeeId),
        scheduledAt: form.scheduledAt,
        notes: form.notes.trim() || undefined,
      });
      setResult(data);
      setLastForm(form);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to generate brief";
      if (msg.toLowerCase().includes("not configured")) {
        toast.error("AI features require OPENAI_API_KEY to be configured");
      } else if (msg.toLowerCase().includes("not found")) {
        toast.error(`${form.attendeeType === "lead" ? "Lead" : "Client"} not found. Check the ID.`);
      } else {
        toast.error(msg);
      }
    }
  }, [form, isValid, generateBrief]);

  const handlePrepareAnother = useCallback(() => {
    setResult(null);
    setForm(INITIAL_FORM);
  }, []);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (result) {
    return (
      <PageWrapper
        title="Meeting Prep Brief"
        subtitle="Generate AI-powered preparation briefs for upcoming meetings"
        badge={
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI
          </span>
        }
      >
        <ResultDisplay
          result={result}
          meetingTitle={lastForm.meetingTitle}
          scheduledAt={lastForm.scheduledAt}
          onPrepareAnother={handlePrepareAnother}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Meeting Prep Brief"
      subtitle="Generate AI-powered preparation briefs for upcoming meetings"
      badge={
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI
        </span>
      }
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Meeting Details
            </CardTitle>
            <CardDescription>
              Fill in the meeting details and the AI will generate a comprehensive pre-meeting brief.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="meeting-title">
                Meeting Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="meeting-title"
                placeholder="e.g. Q2 Review with Acme Corp, Initial Discovery Call…"
                value={form.meetingTitle}
                onChange={(e) => setField("meetingTitle", e.target.value)}
                aria-label="Meeting title"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Attendee Type <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                {(["lead", "client"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setField("attendeeType", type)}
                    aria-pressed={form.attendeeType === type}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                      form.attendeeType === type
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {type === "lead" ? "Lead (Prospect)" : "Client (Existing)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attendee-id">
                {form.attendeeType === "lead" ? "Lead ID" : "Client ID"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="attendee-id"
                  type="number"
                  min="1"
                  placeholder={`Enter ${form.attendeeType === "lead" ? "lead" : "client"} ID…`}
                  value={form.attendeeId}
                  onChange={(e) => setField("attendeeId", e.target.value)}
                  className="max-w-xs"
                  aria-label={form.attendeeType === "lead" ? "Lead ID" : "Client ID"}
                />
                <Badge variant="secondary" className="text-xs shrink-0">
                  {form.attendeeType === "lead" ? "From Lead Pipeline" : "From Client Accounts"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Find the ID from the{" "}
                {form.attendeeType === "lead" ? "Lead Pipeline" : "Client Accounts"} list.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scheduled-at">
                Scheduled Date &amp; Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setField("scheduledAt", e.target.value)}
                className="max-w-xs"
                aria-label="Meeting scheduled date and time"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="meeting-notes">
                Additional Notes{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="meeting-notes"
                placeholder="Any additional context about this meeting — agenda items, specific concerns, goals…"
                rows={4}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className="resize-none"
                aria-label="Additional meeting notes"
              />
            </div>

            <Button
              className="w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={!isValid || isPending}
              aria-label="Generate meeting brief"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Brief…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Brief
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-foreground mb-2">The brief will include</p>
            <ul className="grid grid-cols-2 gap-1.5">
              {[
                "Meeting overview & objectives",
                "Attendee background & history",
                "Relationship status summary",
                "Key discussion points",
                "Pain points & opportunities",
                "Suggested questions to ask",
                "Pre-meeting checklist",
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
