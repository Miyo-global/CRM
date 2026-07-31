"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  BarChart2,
  Trash2,
  Plus,
  Users,
  Eye,
  MousePointerClick,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSocialMetrics,
  useRecordSocialMetrics,
  useDeleteSocialMetric,
  type SocialMetric,
} from "@/lib/api/hooks/marketing";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";


const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
] as const;

type PlatformFilter = (typeof PLATFORMS)[number]["value"];

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-blue-500",
  twitter: "bg-sky-400",
  instagram: "bg-pink-500",
  facebook: "bg-indigo-500",
  youtube: "bg-red-500",
};

const PLATFORM_BADGE: Record<string, string> = {
  linkedin: "text-blue-700 bg-blue-50 border-blue-200",
  twitter: "text-sky-700 bg-sky-50 border-sky-200",
  instagram: "text-pink-700 bg-pink-50 border-pink-200",
  facebook: "text-indigo-700 bg-indigo-50 border-indigo-200",
  youtube: "text-red-700 bg-red-50 border-red-200",
};


function BarChartViz({ metrics }: { metrics: SocialMetric[] }) {
  const recent = useMemo(
    () =>
      [...metrics]
        .sort((a, b) => new Date(a.metricDate).getTime() - new Date(b.metricDate).getTime())
        .slice(-8),
    [metrics]
  );

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <Image
          src="/illustrations/undraw-social-media-post.svg"
          alt=""
          width={72}
          height={72}
          className="opacity-70"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">No data to display</p>
      </div>
    );
  }

  const maxVal = Math.max(...recent.map((r) => r.impressions), 1);

  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {recent.map((r) => {
        const heightPct = Math.max((r.impressions / maxVal) * 100, 2);
        const color = PLATFORM_COLORS[r.platform] ?? "bg-gold";
        return (
          <div key={r.id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="text-[9px] text-muted-foreground font-medium">
              {r.impressions.toLocaleString()}
            </span>
            <div
              className={cn("w-full rounded-t-sm transition-all", color)}
              style={{ height: `${heightPct}%` }}
              title={`${r.metricDate}: ${r.impressions.toLocaleString()} impressions`}
            />
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">
              {r.metricDate.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}


interface LogMetricsSheetProps {
  open: boolean;
  onClose: () => void;
}

function LogMetricsSheet({ open, onClose }: LogMetricsSheetProps) {
  const today = new Date().toISOString().split("T")[0];
  const [platform, setPlatform] = useState<string>("linkedin");
  const [metricDate, setMetricDate] = useState(today);
  const [followers, setFollowers] = useState("");
  const [impressions, setImpressions] = useState("");
  const [engagements, setEngagements] = useState("");
  const [clicks, setClicks] = useState("");
  const [shares, setShares] = useState("");
  const [comments, setComments] = useState("");
  const [reach, setReach] = useState("");

  const { mutate, isPending } = useRecordSocialMetrics();

  const reset = useCallback(() => {
    setPlatform("linkedin");
    setMetricDate(today);
    setFollowers("");
    setImpressions("");
    setEngagements("");
    setClicks("");
    setShares("");
    setComments("");
    setReach("");
  }, [today]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!platform || !metricDate || !followers) return;

      mutate(
        {
          platform,
          metricDate,
          followers: Number(followers),
          impressions: impressions ? Number(impressions) : 0,
          engagements: engagements ? Number(engagements) : 0,
          clicks: clicks ? Number(clicks) : 0,
          shares: shares ? Number(shares) : 0,
          comments: comments ? Number(comments) : 0,
          reach: reach ? Number(reach) : 0,
        },
        {
          onSuccess: () => {
            toast.success("Metrics recorded successfully");
            reset();
            onClose();
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        }
      );
    },
    [platform, metricDate, followers, impressions, engagements, clicks, shares, comments, reach, mutate, reset, onClose]
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-gold" aria-hidden="true" />
            Log Social Metrics
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sm-platform" className="text-xs font-medium">
              Platform <span className="text-destructive">*</span>
            </Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="sm-platform" className="text-sm" aria-label="Select platform">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.filter((p) => p.value !== "all").map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sm-date" className="text-xs font-medium">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sm-date"
              type="date"
              value={metricDate}
              onChange={(e) => setMetricDate(e.target.value)}
              className="text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sm-followers" className="text-xs font-medium">
              Followers <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sm-followers"
              type="number"
              min={0}
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              placeholder="0"
              className="text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: "sm-impressions", label: "Impressions", val: impressions, set: setImpressions },
                { id: "sm-engagements", label: "Engagements", val: engagements, set: setEngagements },
                { id: "sm-clicks", label: "Clicks", val: clicks, set: setClicks },
                { id: "sm-shares", label: "Shares", val: shares, set: setShares },
                { id: "sm-comments", label: "Comments", val: comments, set: setComments },
                { id: "sm-reach", label: "Reach", val: reach, set: setReach },
              ] as const
            ).map(({ id, label, val, set }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs font-medium">
                  {label}
                </Label>
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder="0"
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          <SheetFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gold hover:bg-gold/90 text-white"
              disabled={isPending || !platform || !metricDate || !followers}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Log Metrics"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}


export default function SocialAnalyticsPage() {
  const [activePlatform, setActivePlatform] = useState<PlatformFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const platform = activePlatform === "all" ? undefined : activePlatform;
  const { data, isLoading } = useSocialMetrics(platform, 30);
  const { mutate: deleteMetric, isPending: isDeleting } = useDeleteSocialMetric();

  const metrics = data?.metrics ?? [];
  const summary = data?.summary ?? { avgEngagement: 0, totalImpressions: 0, totalClicks: 0, followerGrowth: 0 };

  const totalFollowers = useMemo(
    () =>
      metrics.length > 0
        ? Math.max(...metrics.map((m) => m.followers))
        : 0,
    [metrics]
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMetric(deleteId, {
      onSuccess: () => {
        toast.success("Metric entry deleted");
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteMetric]);

  return (
    <PageWrapper
      title="Social Media Analytics"
      subtitle="Track engagement metrics across platforms"
      actions={
        <Button
          className="bg-gold hover:bg-gold/90 text-white"
          onClick={() => setSheetOpen(true)}
          aria-label="Log new social metrics"
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Log Metrics
        </Button>
      }
    >
      <div className="flex gap-1 flex-wrap">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            onClick={() => setActivePlatform(p.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              activePlatform === p.value
                ? "bg-gold text-white border-gold"
                : "bg-transparent text-muted-foreground border-border hover:border-gold/50"
            )}
            aria-pressed={activePlatform === p.value}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Followers"
              value={totalFollowers.toLocaleString()}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Avg Engagement"
              value={summary.avgEngagement.toLocaleString()}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              label="Total Impressions"
              value={summary.totalImpressions.toLocaleString()}
              icon={Eye}
              color="gold"
            />
            <StatCard
              label="Total Clicks"
              value={summary.totalClicks.toLocaleString()}
              icon={MousePointerClick}
              color="purple"
            />
          </>
        )}
      </div>

      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-gold" aria-hidden="true" />
            Impressions — Last 8 Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <BarChartViz metrics={metrics} />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Recent Entries (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : metrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Image
                src="/illustrations/undraw-social-media-post.svg"
                alt=""
                width={140}
                height={140}
                className="opacity-80"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                No metrics logged yet. Click &quot;Log Metrics&quot; to add your first entry.
              </p>
            </div>
          ) : (
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Platform</TableHead>
                      <TableHead className="text-xs text-right">Followers</TableHead>
                      <TableHead className="text-xs text-right">Impressions</TableHead>
                      <TableHead className="text-xs text-right">Engagements</TableHead>
                      <TableHead className="text-xs text-right">Clicks</TableHead>
                      <TableHead className="text-xs w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm font-medium">{m.metricDate}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize",
                              PLATFORM_BADGE[m.platform] ?? ""
                            )}
                          >
                            {m.platform}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right">{m.followers.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-right">{m.impressions.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-right">{m.engagements.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-right">{m.clicks.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(m.id)}
                            aria-label={`Delete metric entry from ${m.metricDate}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <LogMetricsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Metric Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this metric entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
