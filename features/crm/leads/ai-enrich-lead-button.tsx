"use client";

import { useState } from "react";
import { Sparkles, Loader2, Building2, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEnrichLead } from "@/lib/api/hooks/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface AIEnrichLeadButtonProps {
  leadName: string;
  company?: string | null;
  email?: string | null;
  designation?: string | null;
  city?: string | null;
}

export function AIEnrichLeadButton({ leadName, company, email, designation, city }: AIEnrichLeadButtonProps) {
  const [open, setOpen] = useState(false);
  const enrichMutation = useEnrichLead();
  const result = enrichMutation.data;

  const handleEnrich = () => {
    enrichMutation.mutate(
      {
        name: leadName,
        company: company ?? undefined,
        email: email ?? undefined,
        designation: designation ?? undefined,
        city: city ?? undefined,
      },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <Sparkles className="h-3 w-3 text-gold" />
          Enrich
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            AI Lead Enrichment
          </SheetTitle>
          <SheetDescription className="text-xs">
            Generate research insights about {leadName}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-4">
            {!result && !enrichMutation.isPending && (
              <Button onClick={handleEnrich} className="w-full" size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Research Brief
              </Button>
            )}

            {enrichMutation.isPending && (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Researching...
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Company Insight
                  </p>
                  <p className="text-sm leading-snug">{result.companyInsight}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">{result.industry}</Badge>
                    <Badge variant="outline" className="text-[10px]">{result.estimatedCompanySize}</Badge>
                  </div>
                </div>

                {result.talkingPoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Talking Points</p>
                    <ul className="space-y-1.5">
                      {result.talkingPoints.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs">
                          <span className="text-gold mt-0.5">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.potentialNeeds.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Potential Needs
                    </p>
                    <ul className="space-y-1.5">
                      {result.potentialNeeds.map((n, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Recommended Approach
                  </p>
                  <p className="text-xs leading-snug">{result.recommendedApproach}</p>
                </div>

                <Button onClick={handleEnrich} variant="outline" size="sm" className="w-full">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
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
