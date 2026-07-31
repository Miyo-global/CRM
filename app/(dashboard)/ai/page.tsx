"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles, Brain, Mail, TrendingUp, Target, MessageSquare,
  FileText, Users, ShieldCheck, Zap, AlertTriangle, ClipboardList,
} from "lucide-react";
import {
  useAIScoreLead, useGenerateEmail, usePredictDeal, useNextBestAction,
  useObjectionHandler, useGenerateSubjectLines, useSentimentAnalysis,
  useAIScoreCandidate, useAIGenerateReview, useAISuggestHelpdeskReply,
  useAIAttritionRisk, useGenerateJobDescription,
  useMeetingPrep, useGenerateContentBrief,
} from "@/lib/api/hooks/ai";

interface AiFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: "sales" | "hr" | "marketing" | "general";
  color: string;
}

const AI_FEATURES: AiFeature[] = [
  { id: "score-lead", title: "Lead Scoring", description: "AI scores leads 0-100 based on engagement, fit, and conversion signals", icon: Target, category: "sales", color: "text-amber-500" },
  { id: "generate-email", title: "Email Generator", description: "Generate follow-up emails in formal, friendly, or urgent tones", icon: Mail, category: "sales", color: "text-blue-500" },
  { id: "predict-deal", title: "Deal Prediction", description: "Predict deal win probability based on pipeline metrics", icon: TrendingUp, category: "sales", color: "text-green-500" },
  { id: "next-action", title: "Next Best Action", description: "AI suggests the optimal next step for any lead", icon: Zap, category: "sales", color: "text-purple-500" },
  { id: "objection-handler", title: "Objection Handler", description: "Get counter-arguments and talking points for sales objections", icon: MessageSquare, category: "sales", color: "text-red-500" },
  { id: "subject-lines", title: "Subject Lines", description: "Generate high-converting email subject line variations", icon: Mail, category: "marketing", color: "text-indigo-500" },
  { id: "content-brief", title: "Content Brief", description: "Create content outlines with keywords, CTA, and word count", icon: FileText, category: "marketing", color: "text-teal-500" },
  { id: "sentiment", title: "Sentiment Analysis", description: "Analyze client communication for churn risk signals", icon: Brain, category: "sales", color: "text-pink-500" },
  { id: "score-candidate", title: "Candidate Scoring", description: "Score job candidates against role requirements", icon: Users, category: "hr", color: "text-cyan-500" },
  { id: "generate-review", title: "Review Generator", description: "Draft employee performance reviews with category ratings", icon: ClipboardList, category: "hr", color: "text-orange-500" },
  { id: "helpdesk-reply", title: "Helpdesk Reply", description: "AI-suggested replies for employee helpdesk tickets", icon: MessageSquare, category: "hr", color: "text-emerald-500" },
  { id: "attrition-risk", title: "Attrition Risk", description: "Predict employee attrition risk based on behavior signals", icon: AlertTriangle, category: "hr", color: "text-red-500" },
  { id: "generate-jd", title: "JD Generator", description: "Generate complete job descriptions from role title", icon: FileText, category: "hr", color: "text-violet-500" },
  { id: "meeting-prep", title: "Meeting Prep", description: "Generate pre-meeting briefs with context and talking points", icon: ShieldCheck, category: "sales", color: "text-sky-500" },
];

const CATEGORIES = [
  { value: "all", label: "All Features" },
  { value: "sales", label: "Sales & CRM" },
  { value: "hr", label: "HR & People" },
  { value: "marketing", label: "Marketing" },
  { value: "general", label: "General" },
];

const HR_FEATURE_ROLES = ["CEO", "HR", "BRANCH_HR", "ADMIN"];

export default function AIHubPage() {
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
      title="AI Hub"
      subtitle="Intelligent tools powered by AI to supercharge your workflow"
    >
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="h-auto w-full justify-start gap-1 rounded-lg p-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="whitespace-nowrap">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.id}
                  className="h-full cursor-pointer border-l-4 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ borderLeftColor: "var(--gold, #bd882c)" }}
                  onClick={() => setActiveFeature(feature)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted shrink-0 ${feature.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm leading-tight">{feature.title}</CardTitle>
                        <Badge variant="outline" className="text-[10px] mt-1">{feature.category}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm leading-relaxed line-clamp-2 min-h-[40px]">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!activeFeature} onOpenChange={(open) => { if (!open) setActiveFeature(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col gap-0 p-0">
          {activeFeature && (
            <>
              <SheetHeader className="px-6 py-4 border-b shrink-0">
                <SheetTitle className="flex items-center gap-2 text-base">
                  {(() => {
                    const Icon = activeFeature.icon;
                    return <Icon className={`h-5 w-5 ${activeFeature.color}`} />;
                  })()}
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
  const [secondInput, setSecondInput] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const scoreLead = useAIScoreLead();
  const generateEmail = useGenerateEmail();
  const predictDeal = usePredictDeal();
  const nextAction = useNextBestAction();
  const objectionHandler = useObjectionHandler();
  const subjectLines = useGenerateSubjectLines();
  const sentiment = useSentimentAnalysis();
  const scoreCandidate = useAIScoreCandidate();
  const generateReview = useAIGenerateReview();
  const helpdeskReply = useAISuggestHelpdeskReply();
  const attritionRisk = useAIAttritionRisk();
  const generateJD = useGenerateJobDescription();
  const meetingPrep = useMeetingPrep();
  const contentBrief = useGenerateContentBrief();

  const isLoading = scoreLead.isPending || generateEmail.isPending || predictDeal.isPending ||
    nextAction.isPending || objectionHandler.isPending || subjectLines.isPending ||
    sentiment.isPending || scoreCandidate.isPending || generateReview.isPending ||
    helpdeskReply.isPending || attritionRisk.isPending || generateJD.isPending ||
    meetingPrep.isPending || contentBrief.isPending;

  const handleSubmit = () => {
    if (!input.trim()) { toast.error("Please enter input"); return; }

    const onSuccess = (data: unknown) => {
      setResult(JSON.stringify(data, null, 2));
      toast.success("AI response generated");
    };
    const onError = (err: Error) => toast.error(err.message);

    const numericFeatures = ["score-lead", "predict-deal", "next-action", "helpdesk-reply", "score-candidate"];
    if (numericFeatures.includes(featureId)) {
      const parsed = Number(input.trim());
      if (!Number.isInteger(parsed) || parsed <= 0) {
        toast.error("Please enter a valid positive ID");
        return;
      }
    }

    switch (featureId) {
      case "score-lead": scoreLead.mutate(Number(input), { onSuccess, onError }); break;
      case "generate-email": generateEmail.mutate({ leadName: input, tone: "friendly" }, { onSuccess, onError }); break;
      case "predict-deal": predictDeal.mutate(Number(input), { onSuccess, onError }); break;
      case "next-action": nextAction.mutate(Number(input), { onSuccess, onError }); break;
      case "objection-handler": objectionHandler.mutate({ objection: input, dealStage: secondInput || "PROPOSAL" }, { onSuccess, onError }); break;
      case "subject-lines": subjectLines.mutate({ campaignContext: input, count: 5 }, { onSuccess, onError }); break;
      case "content-brief": contentBrief.mutate({ topic: input, contentType: "blog" }, { onSuccess, onError }); break;
      case "sentiment": sentiment.mutate({ text: input }, { onSuccess, onError }); break;
      case "score-candidate": scoreCandidate.mutate({ candidateId: Number(input) }, { onSuccess, onError }); break;
      case "generate-review": generateReview.mutate({ userId: input, periodStart: "2026-01-01", periodEnd: "2026-03-31" }, { onSuccess, onError }); break;
      case "helpdesk-reply": helpdeskReply.mutate(Number(input), { onSuccess, onError }); break;
      case "attrition-risk": attritionRisk.mutate(input, { onSuccess, onError }); break;
      case "generate-jd": generateJD.mutate({ title: input, location: secondInput || undefined }, { onSuccess, onError }); break;
      case "meeting-prep": meetingPrep.mutate({ meetingTitle: input, attendeeType: "lead", attendeeId: Number(secondInput || "0"), scheduledAt: new Date().toISOString() }, { onSuccess, onError }); break;
      default: toast.error("Feature not implemented");
    }
  };

  const getInputConfig = () => {
    switch (featureId) {
      case "score-lead": return { label: "Lead ID", placeholder: "Enter lead ID (number)", type: "number" };
      case "generate-email": return { label: "Lead Name", placeholder: "Enter lead/prospect name", type: "text" };
      case "predict-deal": return { label: "Deal ID", placeholder: "Enter deal ID", type: "number" };
      case "next-action": return { label: "Lead ID", placeholder: "Enter lead ID", type: "number" };
      case "objection-handler": return { label: "Objection", placeholder: "What objection did the prospect raise?", type: "text", hasSecond: true, secondLabel: "Deal Stage", secondPlaceholder: "e.g., PROPOSAL, NEGOTIATION" };
      case "subject-lines": return { label: "Topic", placeholder: "Campaign topic or product name", type: "text" };
      case "content-brief": return { label: "Topic", placeholder: "Content topic", type: "text" };
      case "sentiment": return { label: "Text to Analyze", placeholder: "Paste client message or email", type: "textarea" };
      case "score-candidate": return { label: "Candidate ID", placeholder: "Enter candidate ID", type: "number" };
      case "generate-review": return { label: "Employee User ID", placeholder: "Enter user ID", type: "text" };
      case "helpdesk-reply": return { label: "Ticket ID", placeholder: "Enter helpdesk ticket ID", type: "number" };
      case "attrition-risk": return { label: "Employee User ID", placeholder: "Enter user ID", type: "text" };
      case "generate-jd": return { label: "Job Title", placeholder: "e.g., Senior Frontend Engineer", type: "text", hasSecond: true, secondLabel: "Location", secondPlaceholder: "e.g., Mumbai, Remote" };
      case "meeting-prep": return { label: "Meeting Title", placeholder: "e.g., Quarterly review with client", type: "text", hasSecond: true, secondLabel: "Attendee ID (Lead)", secondPlaceholder: "Lead ID number" };
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

      {"hasSecond" in config && config.hasSecond && (
        <div className="space-y-1.5">
          <Label>{config.secondLabel}</Label>
          <Input value={secondInput} onChange={(e) => setSecondInput(e.target.value)} placeholder={config.secondPlaceholder} />
        </div>
      )}

      <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
        <Sparkles className="mr-2 h-4 w-4" />
        {isLoading ? "Processing..." : "Run AI"}
      </Button>

      {result && (
        <div className="max-h-80 overflow-auto rounded-lg bg-muted p-4">
          <pre className="text-xs whitespace-pre-wrap break-words">{result}</pre>
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
