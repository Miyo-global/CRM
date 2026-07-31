"use client";

import { useState, type ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Plus, TrendingUp, TrendingDown, Minus, Users, Eye, MousePointerClick,
  Instagram, Twitter, Linkedin, Facebook, Youtube, Activity, BarChart3,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useSocialMediaLatest, useUpsertSocialMediaStats } from "@/lib/api/hooks/social-media";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PLATFORMS = ["instagram", "twitter", "linkedin", "facebook", "youtube"] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_META: Record<Platform, {
  label: string;
  icon: LucideIcon;
  gradient: string;
  accent: string;
  iconBg: string;
  ring: string;
}> = {
  instagram: {
    label: "Instagram",
    icon: Instagram,
    gradient: "from-pink-500/15 via-fuchsia-500/10 to-orange-400/10",
    accent: "text-pink-500",
    iconBg: "bg-gradient-to-br from-pink-500 to-orange-400 text-white",
    ring: "ring-pink-500/20",
  },
  twitter: {
    label: "Twitter / X",
    icon: Twitter,
    gradient: "from-sky-500/15 via-slate-500/10 to-slate-900/10",
    accent: "text-sky-500",
    iconBg: "bg-gradient-to-br from-sky-500 to-slate-800 text-white",
    ring: "ring-sky-500/20",
  },
  linkedin: {
    label: "LinkedIn",
    icon: Linkedin,
    gradient: "from-blue-600/15 via-blue-500/10 to-sky-400/10",
    accent: "text-blue-600",
    iconBg: "bg-gradient-to-br from-blue-600 to-sky-500 text-white",
    ring: "ring-blue-500/20",
  },
  facebook: {
    label: "Facebook",
    icon: Facebook,
    gradient: "from-blue-700/15 via-blue-600/10 to-indigo-500/10",
    accent: "text-blue-700",
    iconBg: "bg-gradient-to-br from-blue-700 to-indigo-600 text-white",
    ring: "ring-blue-600/20",
  },
  youtube: {
    label: "YouTube",
    icon: Youtube,
    gradient: "from-red-500/15 via-rose-500/10 to-orange-500/10",
    accent: "text-red-500",
    iconBg: "bg-gradient-to-br from-red-500 to-rose-600 text-white",
    ring: "ring-red-500/20",
  },
};

const compactNumber = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function MetricRow({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-sm font-semibold tabular-nums shrink-0">{value}</span>
    </div>
  );
}

export default function SocialMediaPage() {
  const [showEntry, setShowEntry] = useState(false);
  const [formData, setFormData] = useState({
    platform: "instagram" as typeof PLATFORMS[number],
    date: new Date().toISOString().split("T")[0],
    postsPublished: 0, storiesReels: 0, followersTotal: 0,
    engagementRate: "", impressions: 0, reach: 0, linkClicks: 0, profileVisits: 0,
  });

  const { data: latestData } = useSocialMediaLatest();
  const upsertMutation = useUpsertSocialMediaStats();

  const platforms = latestData;

  return (
    <PageWrapper
      title="Social Media Tracker"
      subtitle="Track daily social media metrics across platforms"
      actions={
        <Button size="sm" onClick={() => setShowEntry(true)}>
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Add Daily Stats</span>
        </Button>
      }
    >
      <div className="space-y-4 sm:space-y-6">

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {PLATFORMS.map((platform, idx) => {
            const meta = PLATFORM_META[platform];
            const Icon = meta.icon;
            const data = platforms?.[platform];
            const latest = data?.latest;
            const previous = data?.previous;
            const newFollowers = latest && previous ? (latest.followersTotal || 0) - (previous.followersTotal || 0) : null;
            const TrendIcon = newFollowers === null || newFollowers === 0 ? Minus : newFollowers > 0 ? TrendingUp : TrendingDown;
            const trendTone =
              newFollowers === null || newFollowers === 0
                ? "bg-muted text-muted-foreground"
                : newFollowers > 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400";

            return (
              <motion.div
                key={platform}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05, ease: "easeOut" }}
              >
                <Card className={cn(
                  "relative overflow-hidden border-border/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
                )}>

                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70 pointer-events-none", meta.gradient)} />
                  <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-white/40 to-transparent blur-2xl pointer-events-none dark:from-white/5" />

                  <CardContent className="relative p-4 sm:p-5">

                    <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className={cn("h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shadow-sm ring-1 shrink-0", meta.iconBg, meta.ring)}>
                          <Icon className="h-4 w-4" strokeWidth={2.25} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight truncate">{meta.label}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
                            {latest ? format(parseISO(latest.date), "MMM d, yyyy") : "Not tracked"}
                          </p>
                        </div>
                      </div>
                      {latest && newFollowers !== null && (
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0", trendTone)}>
                          <TrendIcon className="h-3 w-3" />
                          {newFollowers > 0 ? "+" : ""}{newFollowers.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {latest ? (
                      <>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Followers</p>
                            <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight truncate">{compactNumber(latest.followersTotal || 0)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Engagement</p>
                            <p className={cn("text-xl sm:text-2xl font-bold tabular-nums tracking-tight truncate", meta.accent)}>
                              {Number(latest.engagementRate || 0).toFixed(2)}
                              <span className="text-xs sm:text-sm font-semibold ml-0.5">%</span>
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border/60 bg-background/60 backdrop-blur-sm divide-y divide-border/60">
                          <MetricRow icon={Eye} label="Impressions" value={compactNumber(latest.impressions || 0)} />
                          <MetricRow icon={Users} label="Reach" value={compactNumber(latest.reach || 0)} />
                          <MetricRow icon={BarChart3} label="Posts" value={(latest.postsPublished || 0).toLocaleString()} />
                          <MetricRow icon={MousePointerClick} label="Link Clicks" value={compactNumber(latest.linkClicks || 0)} />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-background/70 border border-dashed border-border flex items-center justify-center mb-2 sm:mb-3">
                          <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/60" />
                        </div>
                        <p className="text-xs font-medium">No data yet</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Add daily stats to get started</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Sheet open={showEntry} onOpenChange={setShowEntry}>
        <SheetContent className="flex flex-col p-0 gap-0 sm:max-w-lg w-full max-w-full">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle>Add Daily Social Stats</SheetTitle>
            <SheetDescription>Track daily platform performance metrics.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Platform</Label>
                <Select value={formData.platform} onValueChange={(v) => setFormData(f => ({ ...f, platform: v as typeof PLATFORMS[number] }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <DatePicker value={formData.date} onChange={(v) => setFormData(f => ({ ...f, date: v }))} placeholder="Select date" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "followersTotal", label: "Total Followers" },
                { key: "engagementRate", label: "Engagement Rate (%)" },
                { key: "postsPublished", label: "Posts Published" },
                { key: "storiesReels", label: "Stories/Reels" },
                { key: "impressions", label: "Impressions" },
                { key: "reach", label: "Reach" },
                { key: "linkClicks", label: "Link Clicks" },
                { key: "profileVisits", label: "Profile Visits" },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type="number"
                    className="h-8"
                    value={(formData as Record<string, unknown>)[field.key] as string}
                    onChange={(e) => setFormData(f => ({
                      ...f,
                      [field.key]: field.key === "engagementRate" ? e.target.value : Number(e.target.value),
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <SheetFooter className="shrink-0 px-4 py-3 border-t w-full flex flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowEntry(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => upsertMutation.mutate(
              formData,
              { onSuccess: () => { toast.success("Stats saved"); setShowEntry(false); }, onError: (err) => toast.error(err.message) }
            )}>Save Stats</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
