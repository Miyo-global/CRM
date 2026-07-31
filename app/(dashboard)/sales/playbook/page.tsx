"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Copy, Check } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


type PlaybookCategory = "Scripts" | "Objections" | "Pricing" | "Qualifying" | "Closing";

interface PlaybookEntry {
  id: number;
  category: PlaybookCategory;
  title: string;
  content: string;
  tags: string[];
}

const PLAYBOOK_ENTRIES: PlaybookEntry[] = [
  {
    id: 1,
    category: "Scripts",
    title: "Cold Call Opening",
    content:
      "Hi [Name], this is [Rep] from Miyo Global. I'm calling because we help professionals like you grow their wealth through structured investment plans. Do you have 2 minutes to hear how we've helped others in [their industry]?",
    tags: ["cold-call", "opening", "intro"],
  },
  {
    id: 2,
    category: "Scripts",
    title: "Follow-up After Demo",
    content:
      "Hi [Name], following up on our conversation from [date]. I wanted to check if you had any questions about the [product] we discussed. Many of our clients find that the [key benefit] really resonates. Would you be open to a quick 15-minute call this week?",
    tags: ["follow-up", "email", "nurture"],
  },
  {
    id: 3,
    category: "Objections",
    title: "Too Expensive",
    content:
      "I understand budget is a concern. Let me reframe this — instead of looking at the cost, let's look at the ROI. Our clients typically see [X]% returns over [Y] years. The question isn't can you afford it, it's can you afford not to invest?",
    tags: ["price", "objection", "ROI"],
  },
  {
    id: 4,
    category: "Objections",
    title: "Need to Think About It",
    content:
      "Of course, this is an important decision. What specific aspect would you like to think through? Is it the investment amount, the timeline, or something else? I'd rather help you work through your concerns now than have you worry alone.",
    tags: ["stalling", "objection", "close"],
  },
  {
    id: 5,
    category: "Objections",
    title: "Already Have an Advisor",
    content:
      "That's great — having an advisor shows you take your finances seriously. Many of our clients work with us alongside their existing advisor. We specialize in [specific niche] that most advisors don't focus on. Would it make sense to see if we complement what you already have?",
    tags: ["competition", "objection"],
  },
  {
    id: 6,
    category: "Qualifying",
    title: "BANT Questions",
    content:
      "Budget: 'What range are you thinking for this investment?' Authority: 'Are you the primary decision maker, or is anyone else involved?' Need: 'What's your biggest financial goal for the next 5 years?' Timeline: 'When are you looking to start?'",
    tags: ["BANT", "discovery", "qualifying"],
  },
  {
    id: 7,
    category: "Qualifying",
    title: "Pain Point Discovery",
    content:
      "Ask: 'What's your biggest frustration with your current investments?' Then listen. Follow up with: 'How long has this been a challenge?' and 'What have you tried so far?' This reveals real pain and urgency.",
    tags: ["discovery", "pain-point"],
  },
  {
    id: 8,
    category: "Pricing",
    title: "Anchoring High",
    content:
      "Always present the premium option first. When you start at ₹10L and move down to ₹5L, ₹5L feels like a bargain. Never lead with the lowest tier — it sets expectations you can't exceed.",
    tags: ["pricing", "anchoring", "negotiation"],
  },
  {
    id: 9,
    category: "Pricing",
    title: "Value Before Price",
    content:
      "Never reveal pricing until you've established value. Build the vision of what life looks like after they invest. Ask permission: 'Before I share numbers, can I show you what other clients in your situation have achieved?' Then present pricing as the investment to get there.",
    tags: ["pricing", "value", "positioning"],
  },
  {
    id: 10,
    category: "Closing",
    title: "Assumptive Close",
    content:
      "Instead of 'Would you like to proceed?', say 'Let's get you started — I just need your PAN and a few minutes to complete the KYC.' Assume the sale and handle objections as they arise rather than asking for permission.",
    tags: ["closing", "technique"],
  },
  {
    id: 11,
    category: "Closing",
    title: "Urgency Close",
    content:
      "Create genuine urgency: 'The current rate locks in at month-end' or 'We have limited slots in the advisory program this quarter.' Never manufacture fake urgency — use real deadlines, real limits.",
    tags: ["closing", "urgency", "scarcity"],
  },
  {
    id: 12,
    category: "Scripts",
    title: "Referral Request",
    content:
      "After a successful investment: 'I'm so glad you're seeing results. I have a question — do you know 2-3 people who might benefit from this same outcome? I'd love to help them the way I've helped you, and your endorsement means everything.'",
    tags: ["referral", "expansion", "script"],
  },
  {
    id: 13,
    category: "Objections",
    title: "Market is Uncertain",
    content:
      "That's exactly why diversification matters. Market uncertainty affects those who are concentrated in one asset. Our structured plans are designed to perform across cycles — let me show you how we've navigated the last 3 market downturns.",
    tags: ["market", "risk", "objection"],
  },
  {
    id: 14,
    category: "Qualifying",
    title: "Risk Tolerance Assessment",
    content:
      "Ask: 'On a scale of 1-10, how would you feel if your investment dropped 20% in value for 6 months before recovering to 30% gains?' This surfaces real risk appetite vs stated risk tolerance — crucial for right product fit.",
    tags: ["risk", "qualifying", "assessment"],
  },
  {
    id: 15,
    category: "Closing",
    title: "Summary Close",
    content:
      "Summarize everything agreed: 'So we've established you want [goal], your timeline is [X] years, and your budget is [Y]. Based on all that, [Plan Name] is the right fit. The next step is [specific action]. Does that work for you?'",
    tags: ["closing", "summary", "recap"],
  },
];

const CATEGORIES: Array<"All" | PlaybookCategory> = [
  "All",
  "Scripts",
  "Objections",
  "Pricing",
  "Qualifying",
  "Closing",
];

const CATEGORY_BADGE_CLASSES: Record<PlaybookCategory, string> = {
  Scripts: "bg-blue-100 text-blue-700 border-blue-200",
  Objections: "bg-red-100 text-red-700 border-red-200",
  Pricing: "bg-amber-100 text-amber-700 border-amber-200",
  Qualifying: "bg-purple-100 text-purple-700 border-purple-200",
  Closing: "bg-green-100 text-green-700 border-green-200",
};


function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [content]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      aria-label="Copy content"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}


function PlaybookCard({ entry }: { entry: PlaybookEntry }) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="h-full flex flex-col shadow-sm hover:shadow-md hover:border-gold/30 transition-all">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4 mb-1.5 font-medium", CATEGORY_BADGE_CLASSES[entry.category])}
              >
                {entry.category}
              </Badge>
              <h3 className="text-sm font-semibold leading-snug">{entry.title}</h3>
            </div>
            <CopyButton content={entry.content} />
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 px-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{entry.content}</p>
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


export default function SalesPlaybookPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"All" | PlaybookCategory>("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return PLAYBOOK_ENTRIES.filter((entry) => {
      const matchesCategory = activeCategory === "All" || entry.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        entry.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [search, activeCategory]);

  return (
    <PageWrapper
      title="Sales Playbook"
      subtitle="Scripts, objection handlers, and best practices for your sales team"
      filters={
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, content, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
          <TabsList className="h-8 gap-0.5">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs h-7 px-3">
                {cat}
                {cat !== "All" && (
                  <span className="ml-1.5 text-[9px] text-muted-foreground">
                    ({PLAYBOOK_ENTRIES.filter((e) => e.category === cat).length})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <p className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          {activeCategory !== "All" && ` in ${activeCategory}`}
          {search && ` matching "${search}"`}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm font-medium text-foreground">No entries found</p>
            <p className="text-xs mt-1">Try a different search or category</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {filtered.map((entry) => (
              <PlaybookCard key={entry.id} entry={entry} />
            ))}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
