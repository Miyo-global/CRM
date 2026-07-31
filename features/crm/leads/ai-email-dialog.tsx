"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, Copy, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGenerateEmail } from "@/lib/api/hooks/ai";
import { toast } from "sonner";
import type { EmailTone } from "@/lib/ai/prompts";

interface AIEmailDialogProps {
  leadName: string;
  company?: string | null;
  designation?: string | null;
  dealStage?: string | null;
  lastActivityType?: string | null;
  lastActivityDate?: string | null;
  potentialValue?: string | null;
  trigger?: React.ReactNode;
}

export function AIEmailDialog({
  leadName,
  company,
  designation,
  dealStage,
  lastActivityType,
  lastActivityDate,
  potentialValue,
  trigger,
}: AIEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<EmailTone>("friendly");
  const [context, setContext] = useState("");
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  const generateMutation = useGenerateEmail();
  const email = generateMutation.data;

  const handleGenerate = useCallback(() => {
    generateMutation.mutate(
      {
        leadName,
        company: company || undefined,
        designation: designation || undefined,
        dealStage: dealStage || undefined,
        lastActivityType: lastActivityType || undefined,
        lastActivityDate: lastActivityDate || undefined,
        potentialValue: potentialValue || undefined,
        tone,
        context: context || undefined,
      },
      {
        onError: (err) => toast.error(err.message || "Email generation failed"),
      },
    );
  }, [generateMutation, leadName, company, designation, dealStage, lastActivityType, lastActivityDate, potentialValue, tone, context]);

  const handleCopy = useCallback(async (type: "subject" | "body") => {
    if (!email) return;
    const text = type === "subject" ? email.subject : email.body;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(`${type === "subject" ? "Subject" : "Body"} copied`);
    setTimeout(() => setCopied(null), 2000);
  }, [email]);

  const handleCopySubject = useCallback(() => handleCopy("subject"), [handleCopy]);
  const handleCopyBody = useCallback(() => handleCopy("body"), [handleCopy]);

  const handleCopyAll = useCallback(async () => {
    if (!email) return;
    await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    toast.success("Email copied to clipboard");
  }, [email]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2 text-gold" />
            AI Email
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            Generate Follow-up Email
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as EmailTone)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                To: {leadName}{company ? ` (${company})` : ""}
              </Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Additional Context (optional)</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Discussed property in Bandra last week, needs to finalize by month end..."
              rows={2}
              className="resize-none text-xs"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full bg-gold hover:bg-gold/90 text-white"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {email ? "Regenerate" : "Generate Email"}
              </>
            )}
          </Button>

          {email && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Subject</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={handleCopySubject}
                  >
                    {copied === "subject" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-sm font-medium">{email.subject}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Body</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={handleCopyBody}
                  >
                    {copied === "body" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{email.body}</div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={handleCopyAll}>
                <Mail className="h-3.5 w-3.5 mr-2" />
                Copy Full Email
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
