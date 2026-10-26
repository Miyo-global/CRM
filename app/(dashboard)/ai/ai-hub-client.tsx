"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import type { Tone } from "@/lib/design/tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, AlertTriangle, ClipboardList, type LucideIcon } from "lucide-react";
import {
  useAIGenerateReview, useAISuggestHelpdeskReply,
  useAIAttritionRisk,
} from "@/lib/api/hooks/ai";

interface AiFeature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: "hr" | "general";
  tone: Tone;
}

const ALL_AI_FEATURES: AiFeature[] = [
  { id: "generate-review", title: "Review Generator", description: "Draft employee performance reviews with category ratings", icon: ClipboardList, category: "hr", tone: "warning" },
  { id: "helpdesk-reply", title: "Helpdesk Reply", description: "AI-suggested replies for employee helpdesk tickets", icon: MessageSquare, category: "hr", tone: "success" },
  { id: "attrition-risk", title: "Attrition Risk", description: "Predict employee attrition risk based on behavior signals", icon: AlertTriangle, category: "hr", tone: "danger" },
];

// The sales and marketing tools (lead scoring, deal prediction, campaign
// subject lines, content briefs, ...) were removed with the sales module.
const AI_FEATURES = ALL_AI_FEATURES;

const CATEGORIES = [
  { value: "all", label: "All Features" },
  { value: "hr", label: "HR & People" },
  { value: "general", label: "General" },
];

const HR_FEATURE_ROLES = ["CEO", "HR", "ADMIN"];

export function AIHubClient() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const canViewHr = !!userRole && HR_FEATURE_ROLES.includes(userRole);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeFeature, setActiveFeature] = useState<AiFeature | null>(null);

  const visibleFeatures = canViewHr
    ? AI_FEATURES
    : AI_FEATURES.filter((f) => f.category !== "hr");

  const filtered = selectedCategory === "all"
    ? visibleFeatures
    : visibleFeatures.filter((f) => f.category === selectedCategory);

  return (
    <PageWrapper
      title="AI hub"
      filters={
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList variant="underline">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="whitespace-nowrap">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState
          title="No results for these filters"
          description="No AI tools in this category yet."
          action={{ label: "Clear filters", onClick: () => setSelectedCategory("all") }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((feature) => (
            <Card
              key={feature.id}
              interactive
              role="button"
              tabIndex={0}
              className="h-full gap-3 p-5 outline-none focus-visible:focus-ring"
              onClick={() => setActiveFeature(feature)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveFeature(feature);
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-sans text-sm font-semibold tracking-normal text-foreground">{feature.title}</h2>
                  <StatusPill tone="neutral" className="mt-1 capitalize">{feature.category}</StatusPill>
                </div>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!activeFeature} onOpenChange={(open) => { if (!open) setActiveFeature(null); }}>
        <SheetContent side="right" size="md" className="flex w-full flex-col gap-0 p-0">
          {activeFeature && (
            <>
              <SheetHeader className="shrink-0 border-b border-border px-6 py-4 pr-12">
                <SheetTitle className="flex items-center gap-3 text-lg">
                  {activeFeature.title}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <AIFeatureForm featureId={activeFeature.id} onClose={() => setActiveFeature(null)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}

function AIFeatureForm({ featureId, onClose }: { featureId: string; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const generateReview = useAIGenerateReview();
  const helpdeskReply = useAISuggestHelpdeskReply();
  const attritionRisk = useAIAttritionRisk();

  const isLoading = generateReview.isPending || helpdeskReply.isPending || attritionRisk.isPending;

  const handleSubmit = () => {
    if (!input.trim()) { toast.error("Please enter input"); return; }

    const onSuccess = (data: unknown) => {
      setResult(JSON.stringify(data, null, 2));
      toast.success("AI response generated");
    };
    const onError = (err: Error) => toast.error(err.message);

    const numericFeatures = ["helpdesk-reply"];
    if (numericFeatures.includes(featureId)) {
      const parsed = Number(input.trim());
      if (!Number.isInteger(parsed) || parsed <= 0) {
        toast.error("Please enter a valid positive ID");
        return;
      }
    }

    switch (featureId) {
      case "generate-review": generateReview.mutate({ userId: input, periodStart: "2026-01-01", periodEnd: "2026-03-31" }, { onSuccess, onError }); break;
      case "helpdesk-reply": helpdeskReply.mutate(Number(input), { onSuccess, onError }); break;
      case "attrition-risk": attritionRisk.mutate(input, { onSuccess, onError }); break;
      default: toast.error("Feature not implemented");
    }
  };

  const getInputConfig = () => {
    switch (featureId) {
      case "generate-review": return { label: "Employee User ID", placeholder: "Enter user ID", type: "text" };
      case "helpdesk-reply": return { label: "Ticket ID", placeholder: "Enter helpdesk ticket ID", type: "number" };
      case "attrition-risk": return { label: "Employee User ID", placeholder: "Enter user ID", type: "text" };
      default: return { label: "Input", placeholder: "Enter input", type: "text" };
    }
  };

  const config = getInputConfig();

  return (
    <div className="space-y-4">
      {config.type !== "none" && (
        <div className="space-y-1.5">
          <Label>{config.label}</Label>
          {config.type === "textarea" ? (
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={config.placeholder} rows={4} />
          ) : (
            <Input type={config.type === "number" ? "number" : "text"} value={input} onChange={(e) => setInput(e.target.value)} placeholder={config.placeholder} />
          )}
        </div>
      )}

      <Button onClick={handleSubmit} loading={isLoading} className="w-full">
        {isLoading ? "Processing..." : "Run AI"}
      </Button>

      {result && (
        <div className="max-h-80 overflow-auto rounded-md border border-border bg-surface-sunken p-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs">{result}</pre>
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
