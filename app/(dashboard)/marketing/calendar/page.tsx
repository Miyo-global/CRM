"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Megaphone, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useMarketingCampaigns, type MarketingCampaign } from "@/lib/api/hooks/crm";
import Link from "next/link";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const CHANNELS = ["All", "email", "social_media", "paid_ads", "content", "event", "sms", "other"];

const CHANNEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  email:        { bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/30" },
  social_media: { bg: "bg-pink-500/20",   text: "text-pink-400",   border: "border-pink-500/30" },
  paid_ads:     { bg: "bg-amber-500/20",  text: "text-amber-400",  border: "border-amber-500/30" },
  content:      { bg: "bg-emerald-500/20",text: "text-emerald-400",border: "border-emerald-500/30" },
  event:        { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  sms:          { bg: "bg-cyan-500/20",   text: "text-cyan-400",   border: "border-cyan-500/30" },
  other:        { bg: "bg-slate-500/20",  text: "text-slate-400",  border: "border-slate-500/30" },
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-500",
  paused:    "bg-amber-500",
  completed: "bg-slate-500",
};

function getChannelColor(channel: string | null) {
  const key = (channel ?? "other").toLowerCase();
  return CHANNEL_COLORS[key] ?? CHANNEL_COLORS.other;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface CampaignOnDay {
  campaign: MarketingCampaign;
  isStart: boolean;
  isEnd: boolean;
  continues: boolean;
}

export default function MarketingCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [channelFilter, setChannelFilter] = useState("All");

  const { data: campaigns, isLoading } = useMarketingCampaigns();

  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.filter(c => {
      if (channelFilter !== "All" && c.channel?.toLowerCase() !== channelFilter) return false;
      if (!c.startDate && !c.endDate) return false;
      return true;
    });
  }, [campaigns, channelFilter]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const dayMap = useMemo(() => {
    const map = new Map<number, CampaignOnDay[]>();
    for (let d = 1; d <= daysInMonth; d++) {
      map.set(d, []);
    }
    filteredCampaigns.forEach(c => {
      const start = c.startDate ? new Date(c.startDate) : null;
      const end = c.endDate ? new Date(c.endDate) : null;

      for (let d = 1; d <= daysInMonth; d++) {
        const dayDate = new Date(year, month, d);
        const afterStart = !start || dayDate >= new Date(year, month > start.getMonth() ? 0 : start.getMonth(), start.getDate() < 1 ? 1 : start.getDate());
        const beforeEnd = !end || dayDate <= new Date(year, month > end.getMonth() ? 11 : end.getMonth(), end.getDate());

        const inRange = (!start || dayDate >= new Date(start.getFullYear(), start.getMonth(), start.getDate())) &&
                       (!end || dayDate <= new Date(end.getFullYear(), end.getMonth(), end.getDate()));

        if (inRange) {
          const isStart = !!start && start.getFullYear() === year && start.getMonth() === month && start.getDate() === d;
          const isEnd = !!end && end.getFullYear() === year && end.getMonth() === month && end.getDate() === d;
          map.get(d)!.push({ campaign: c, isStart, isEnd, continues: !isEnd });
        }
      }
    });
    return map;
  }, [filteredCampaigns, year, month, daysInMonth]);

  const prevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }, [month]);

  const goToday = useCallback(() => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }, [today]);

  const monthCampaigns = useMemo(() => {
    return filteredCampaigns.filter(c => {
      const start = c.startDate ? new Date(c.startDate) : null;
      const end = c.endDate ? new Date(c.endDate) : null;
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      return (!start || start <= monthEnd) && (!end || end >= monthStart);
    });
  }, [filteredCampaigns, year, month]);

  if (isLoading) {
    return (
      <PageWrapper title="Marketing Calendar" subtitle="Visualize campaign timelines and deadlines">
        <Skeleton className="h-[600px]" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Marketing Calendar"
      subtitle="Visualize campaign timelines, events, and content deadlines"
      filters={
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map(ch => (
                <SelectItem key={ch} value={ch} className="text-xs">
                  {ch === "All" ? "All Channels" : ch.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      actions={
        <Link href="/marketing/campaigns">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </Button>
        </Link>
      }
    >
      <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
        <div className="grid gap-4 lg:grid-cols-4">
          <motion.div variants={fadeUp} className="lg:col-span-3">
            <Card className="shadow-noir">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} aria-label="Previous month">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-base font-semibold min-w-[160px] text-center">
                      {MONTH_NAMES[month]} {year}
                    </h2>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} aria-label="Next month">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={goToday}>
                    Today
                  </Button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-background min-h-[80px] p-1" />
                  ))}

                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                    const dayCampaigns = dayMap.get(day) ?? [];

                    return (
                      <div
                        key={day}
                        className={cn(
                          "bg-background min-h-[80px] p-1 transition-colors",
                          isToday && "bg-gold/5"
                        )}
                      >
                        <div className={cn(
                          "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                          isToday ? "bg-gold text-white" : "text-muted-foreground"
                        )}>
                          {day}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {dayCampaigns.slice(0, 3).map(({ campaign, isStart }) => {
                            const color = getChannelColor(campaign.channel);
                            return (
                              <TooltipProvider key={campaign.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link href="/marketing/campaigns">
                                      <div className={cn(
                                        "text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity border",
                                        color.bg, color.text, color.border
                                      )}>
                                        {isStart && <span className="mr-0.5">●</span>}
                                        {campaign.name}
                                      </div>
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <p className="font-medium">{campaign.name}</p>
                                      {campaign.channel && <p className="text-muted-foreground">Channel: {campaign.channel}</p>}
                                      {campaign.startDate && <p>Start: {new Date(campaign.startDate).toLocaleDateString(DEFAULT_LOCALE)}</p>}
                                      {campaign.endDate && <p>End: {new Date(campaign.endDate).toLocaleDateString(DEFAULT_LOCALE)}</p>}
                                      <Badge className={cn("text-[10px] text-white", STATUS_COLORS[campaign.status] ?? "bg-slate-500")}>
                                        {campaign.status}
                                      </Badge>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                          {dayCampaigns.length > 3 && (
                            <div className="text-[9px] text-muted-foreground px-1">
                              +{dayCampaigns.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-3">
            <Card className="shadow-noir">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium">
                    {MONTH_NAMES[month]} Campaigns
                  </span>
                  <Badge variant="secondary" className="text-xs ml-auto">{monthCampaigns.length}</Badge>
                </div>

                {monthCampaigns.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    <CalendarDays className="h-6 w-6 mx-auto mb-2 opacity-30" />
                    No campaigns this month
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {monthCampaigns.map(c => {
                      const color = getChannelColor(c.channel);
                      return (
                        <Link key={c.id} href="/marketing/campaigns">
                          <div className={cn(
                            "p-2.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity",
                            color.bg, color.border
                          )}>
                            <div className="flex items-start justify-between gap-1">
                              <p className={cn("text-xs font-medium truncate", color.text)}>{c.name}</p>
                              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0 mt-1", STATUS_COLORS[c.status] ?? "bg-slate-500")} />
                            </div>
                            {c.channel && (
                              <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                                {c.channel.replace("_", " ")}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                              {c.startDate && <span>{new Date(c.startDate).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" })}</span>}
                              {c.startDate && c.endDate && <span>→</span>}
                              {c.endDate && <span>{new Date(c.endDate).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" })}</span>}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-noir">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Channel Legend</p>
                <div className="space-y-1">
                  {Object.entries(CHANNEL_COLORS).map(([ch, color]) => (
                    <div key={ch} className="flex items-center gap-2">
                      <div className={cn("h-2.5 w-2.5 rounded-sm border", color.bg, color.border)} />
                      <span className="text-xs text-muted-foreground capitalize">{ch.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
