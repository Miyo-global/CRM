"use client";

import { useState, useCallback } from "react";
import {
  Loader2,
  Copy,
  CheckCheck,
  Sparkles,
  ListOrdered,
  Lightbulb,
  Tag,
  MessageSquareQuote,
  Users,
  Hash,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useGenerateContentBrief, type ContentBrief } from "@/lib/api/hooks/ai";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";

const CONTENT_TYPES = [
  { value: "blog", label: "Blog Post" },
  { value: "email", label: "Email Newsletter" },
  { value: "whitepaper", label: "Whitepaper" },
  { value: "social", label: "Social Media Post" },
  { value: "video", label: "Video Script" },
] as const;

function ContentBriefEmptyState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[360px] px-4">
      <EmptyState
        illustration={<EmptyDocumentsIllustration className="h-32 w-32 opacity-95" />}
        title="No brief generated yet"
        description="Fill in the form and generate a structured content brief."
      />
    </div>
  );
}

interface BriefDisplayProps {
  brief: ContentBrief;
}

function BriefDisplay({ brief }: BriefDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const md = [
      `# ${brief.title}`,
      "",
      `**Estimated Word Count:** ${brief.estimatedWordCount.toLocaleString()}`,
      "",
      "## Content Outline",
      ...brief.outline.map((item, i) => `${i + 1}. ${item}`),
      "",
      "## Key Points",
      ...brief.keyPoints.map((kp) => `- ${kp}`),
      "",
      "## SEO Keywords",
      brief.seoKeywords.join(", "),
      "",
      "## Target Audience Insights",
      brief.targetAudienceInsights,
      "",
      "## Call to Action",
      brief.callToAction,
    ].join("\n");

    await navigator.clipboard.writeText(md);
    setCopied(true);
    toast.success("Brief copied to clipboard as Markdown");
    setTimeout(() => setCopied(false), 2000);
  }, [brief]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground leading-snug">{brief.title}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
          aria-label="Copy brief as Markdown"
        >
          {copied ? (
            <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">{copied ? "Copied!" : "Copy all"}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs gap-1">
          <Hash className="h-3 w-3" />
          {brief.estimatedWordCount.toLocaleString()} words
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-gold" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Content Outline</h3>
        </div>
        <ol className="space-y-1.5 ml-1">
          {brief.outline.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-foreground">
              <span className="shrink-0 w-5 h-5 rounded-full bg-gold/10 text-gold text-xs flex items-center justify-center font-medium">
                {i + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-gold" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Key Points</h3>
        </div>
        <ul className="space-y-1.5 ml-1">
          {brief.keyPoints.map((kp, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-foreground">
              <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-gold" aria-hidden="true" />
              <span>{kp}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-gold" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">SEO Keywords</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {brief.seoKeywords.map((kw, i) => (
            <Badge key={i} variant="outline" className="text-xs font-normal">
              {kw}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-4 w-4 text-gold" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Call to Action</h3>
        </div>
        <blockquote className="border-l-4 border-gold pl-4 py-1 text-sm text-foreground italic bg-gold/5 rounded-r-md">
          {brief.callToAction}
        </blockquote>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gold" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Target Audience Insights</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{brief.targetAudienceInsights}</p>
      </div>
    </div>
  );
}

export default function ContentBriefPage() {
  const [topic, setTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [contentType, setContentType] = useState<string>("");
  const [keywords, setKeywords] = useState("");
  const [brief, setBrief] = useState<ContentBrief | null>(null);

  const { mutate, isPending } = useGenerateContentBrief();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!topic.trim()) return;

      mutate(
        {
          topic: topic.trim(),
          targetAudience: targetAudience.trim() || undefined,
          contentType: contentType || undefined,
          keywords: keywords.trim() || undefined,
        },
        {
          onSuccess: (data) => {
            setBrief(data);
            toast.success("Content brief generated successfully");
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : "Failed to generate brief");
          },
        },
      );
    },
    [topic, targetAudience, contentType, keywords, mutate],
  );

  return (
    <PageWrapper
      title="Content Brief Generator"
      subtitle="AI-powered structured briefs for financial services content"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/5 shrink-0">
          <Card className="shadow-noir">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
                Brief Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="topic" className="text-xs font-medium">
                    Topic <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Why SIP is the best wealth-building tool for millennials"
                    required
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="targetAudience" className="text-xs font-medium">
                    Target Audience
                    <span className="text-muted-foreground ml-1">(optional)</span>
                  </Label>
                  <Input
                    id="targetAudience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Working professionals aged 25–35 in metro cities"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contentType" className="text-xs font-medium">
                    Content Type
                    <span className="text-muted-foreground ml-1">(optional)</span>
                  </Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger id="contentType" className="text-sm" aria-label="Select content type">
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value}>
                          {ct.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="keywords" className="text-xs font-medium">
                    Keywords
                    <span className="text-muted-foreground ml-1">(optional, comma-separated)</span>
                  </Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. SIP, mutual funds, wealth management, SEBI"
                    className="text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isPending || !topic.trim()}
                  className="w-full bg-gold hover:bg-gold/90 text-white"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                      Generate Brief
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          <Card
            className={cn(
              "shadow-noir h-full",
              isPending && "animate-pulse opacity-70",
            )}
          >
            <CardContent className="p-5">
              {isPending ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[360px] gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Crafting your content brief…</p>
                </div>
              ) : brief ? (
                <BriefDisplay brief={brief} />
              ) : (
                <ContentBriefEmptyState />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
