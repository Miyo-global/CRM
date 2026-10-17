"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAIGenerateReview } from "@/lib/api/hooks/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface AIGenerateReviewButtonProps {
  userId: string;
  userName: string;
  periodStart: string;
  periodEnd: string;
}

export function AIGenerateReviewButton({ userId, userName, periodStart, periodEnd }: AIGenerateReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const generateMutation = useAIGenerateReview();
  const result = generateMutation.data;

  const handleGenerate = () => {
    generateMutation.mutate(
      { userId, periodStart, periodEnd },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  };

  const copyAll = () => {
    if (!result) return;
    const text = `OVERALL: ${result.overallRating}/5

STRENGTHS:
${result.strengths}

AREAS FOR IMPROVEMENT:
${result.improvements}

COMMENTS:
${result.comments}

CATEGORY RATINGS:
${result.ratings.map((r) => `- ${r.category}: ${r.score}/5 — ${r.comment}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    toast.success("Review copied to clipboard");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="size-4 text-brand-text" aria-hidden="true" />
          AI Draft Review
        </Button>
      </SheetTrigger>
      <SheetContent size="lg" className="flex w-full flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 border-b px-5 pb-4 pt-5 pr-12">
          <SheetTitle className="flex items-center gap-2.5 font-display text-lg">
            AI Performance Review Draft
          </SheetTitle>
          <SheetDescription className="text-xs tabular-nums">
            For {userName} — {periodStart} to {periodEnd}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-5 px-5 py-4">
            {!result && !generateMutation.isPending && (
              <Button onClick={handleGenerate} className="w-full">
                <Sparkles className="size-4" aria-hidden="true" />
                Generate Review Draft
              </Button>
            )}

            {generateMutation.isPending && (
              <div role="status" className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-sunken/40 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Drafting review...
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-sunken/60 p-4">
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Rating</p>
                    <p className="font-display text-3xl font-extrabold tabular-nums text-foreground">{result.overallRating}<span className="text-base font-semibold text-muted-foreground">/5</span></p>
                  </div>
                  <Button size="sm" variant="outline" onClick={copyAll}>
                    <Copy className="size-4" aria-hidden="true" />
                    Copy All
                  </Button>
                </div>

                <div>
                  <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Strengths</p>
                  <p className="text-sm leading-relaxed text-foreground">{result.strengths}</p>
                </div>

                <div>
                  <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Areas for Improvement</p>
                  <p className="text-sm leading-relaxed text-foreground">{result.improvements}</p>
                </div>

                <div>
                  <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Comments</p>
                  <p className="text-sm leading-relaxed text-foreground">{result.comments}</p>
                </div>

                <div>
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Category Ratings</p>
                  <div className="space-y-2">
                    {result.ratings.map((r, i) => (
                      <div key={i} className="rounded-md border border-border bg-card p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{r.category}</span>
                          <Badge variant="secondary" className="tabular-nums">{r.score}/5</Badge>
                        </div>
                        <p className="text-xs leading-snug text-muted-foreground">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleGenerate} variant="outline" size="sm" className="w-full">
                  <Sparkles className="size-4" aria-hidden="true" />
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
