"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useObjectionHandler, useGenerateSubjectLines } from "@/lib/api/hooks/ai";
import type { ObjectionHandlerResult, SubjectLinesResult } from "@/lib/api/hooks/ai";
import { Loader2, Copy, CheckCheck, Sparkles, MessageSquareQuote, Mail } from "lucide-react";
import { toast } from "sonner";



function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
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
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <CheckCheck className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}



function ObjectionHandlerTab() {
  const [objection, setObjection] = useState("");
  const [dealStage, setDealStage] = useState("");
  const [productName, setProductName] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [result, setResult] = useState<ObjectionHandlerResult | null>(null);

  const mutation = useObjectionHandler();

  const handleSubmit = useCallback(async () => {
    if (!objection.trim() || !dealStage) return;

    try {
      const data = await mutation.mutateAsync({
        objection: objection.trim(),
        dealStage,
        productName: productName.trim() || undefined,
        dealValue: dealValue.trim() || undefined,
      });
      setResult(data);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to generate response";
      if (msg.toLowerCase().includes("not configured")) {
        toast.error("AI features require OPENAI_API_KEY to be configured");
      } else {
        toast.error(msg);
      }
    }
  }, [objection, dealStage, productName, dealValue, mutation]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Paste a client objection and get counter-arguments, talking points, and a suggested response script tailored for the Indian B2B investment market.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Objection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="objection">Client Objection <span className="text-destructive">*</span></Label>
            <Textarea
              id="objection"
              value={objection}
              onChange={(e) => setObjection(e.target.value)}
              placeholder="The price is too high compared to competitors..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-stage">Deal Stage <span className="text-destructive">*</span></Label>
              <Select value={dealStage} onValueChange={setDealStage}>
                <SelectTrigger id="deal-stage">
                  <SelectValue placeholder="Select stage..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-name">Product / Service <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. SIP Growth Fund"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deal-value">Deal Value <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="deal-value"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="e.g. ₹5L"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!objection.trim() || !dealStage || mutation.isPending}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {mutation.isPending ? "Generating..." : "Get Counter-Arguments"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Counter-Arguments</CardTitle>
                <CopyButton
                  text={result.counterArguments.join("\n")}
                  label="counter-arguments"
                />
              </div>
              <CardDescription className="text-xs">Use these to directly address the objection</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.counterArguments.map((arg, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-foreground leading-snug">{arg}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Talking Points</CardTitle>
                <CopyButton
                  text={result.talkingPoints.join("\n")}
                  label="talking-points"
                />
              </div>
              <CardDescription className="text-xs">Key messages to emphasize in your conversation</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.talkingPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="text-foreground leading-snug">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Suggested Response Script</CardTitle>
                <CopyButton text={result.suggestedResponse} label="suggested response" />
              </div>
              <CardDescription className="text-xs">A ready-to-use response you can adapt for the conversation</CardDescription>
            </CardHeader>
            <CardContent>
              <blockquote className="rounded-lg border-l-4 border-primary bg-muted/40 px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {result.suggestedResponse}
              </blockquote>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}



function SubjectLineGeneratorTab() {
  const [campaignContext, setCampaignContext] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "urgent" | "curiosity" | "">("");
  const [result, setResult] = useState<SubjectLinesResult | null>(null);

  const mutation = useGenerateSubjectLines();

  const handleSubmit = useCallback(async () => {
    if (!campaignContext.trim()) return;

    try {
      const data = await mutation.mutateAsync({
        campaignContext: campaignContext.trim(),
        targetAudience: targetAudience.trim() || undefined,
        tone: tone || undefined,
        count: 5,
      });
      setResult(data);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to generate subject lines";
      if (msg.toLowerCase().includes("not configured")) {
        toast.error("AI features require OPENAI_API_KEY to be configured");
      } else {
        toast.error(msg);
      }
    }
  }, [campaignContext, targetAudience, tone, mutation]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Generate 5 compelling email subject line variations optimized for B2B financial services campaigns in the Indian market.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-context">Campaign Context <span className="text-destructive">*</span></Label>
            <Textarea
              id="campaign-context"
              value={campaignContext}
              onChange={(e) => setCampaignContext(e.target.value)}
              placeholder="We're launching a new SIP investment product targeting young professionals aged 25-35 in tier-1 cities..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="target-audience">Target Audience <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="target-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. HNI investors, working professionals"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tone">Tone <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select
                value={tone}
                onValueChange={(v) =>
                  setTone(v as "professional" | "friendly" | "urgent" | "curiosity")
                }
              >
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Select tone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="curiosity">Curiosity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!campaignContext.trim() || mutation.isPending}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {mutation.isPending ? "Generating..." : "Generate Subject Lines"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Generated Subject Lines</CardTitle>
              <CopyButton
                text={result.subjects.map((s, i) => `${i + 1}. ${s}`).join("\n")}
                label="all subject lines"
              />
            </div>
            <CardDescription className="text-xs">
              Click the copy icon on any subject line to use it in your campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {result.subjects.map((subject, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground truncate">{subject}</span>
                  </div>
                  <CopyButton text={subject} label={`subject line ${i + 1}`} />
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



export default function AISalesToolsPage() {
  return (
    <PageWrapper
      title="AI Sales Tools"
      subtitle="AI-powered tools to help close more deals and craft better campaigns"
      badge={<span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />AI</span>}
    >
      <Tabs defaultValue="objection-handler" className="space-y-5">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="objection-handler" className="gap-1.5">
            <MessageSquareQuote className="h-4 w-4" />
            Objection Handler
          </TabsTrigger>
          <TabsTrigger value="subject-lines" className="gap-1.5">
            <Mail className="h-4 w-4" />
            Subject Lines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="objection-handler">
          <ObjectionHandlerTab />
        </TabsContent>

        <TabsContent value="subject-lines">
          <SubjectLineGeneratorTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
