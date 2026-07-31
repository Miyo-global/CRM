"use client";

import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  EmptyTargetIllustration,
  EmptyLeaderboardIllustration,
  EmptyCalendarIllustration,
} from "@/components/illustrations";
import {
  Trophy, Target, TrendingUp, Medal,
  Zap, Phone, UserCheck, BarChart3, Calendar, History,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeUp, slideInLeft } from "@/lib/motion-variants";
import { useMyTargets, useTargetLeaderboard, useCreateTarget, useTargetHistory } from "@/lib/api/hooks/crm";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { formatDistanceToNow } from "date-fns";
import { CreateTargetSheet } from "@/features/crm/targets/create-target-sheet";
import { getInitials } from "@/lib/format-utils";
const METRIC_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  calls: { icon: Phone, color: "text-blue-400" },
  leads_converted: { icon: UserCheck, color: "text-emerald-400" },
  revenue: { icon: TrendingUp, color: "text-gold" },
  meetings: { icon: Calendar, color: "text-purple-400" },
  deals: { icon: Zap, color: "text-amber-400" },
};

const RANK_STYLES = [
  { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", ring: "ring-amber-500/10", bar: "bg-gradient-to-r from-amber-500 to-amber-400", badge: "bg-amber-500 text-white" },
  { bg: "bg-slate-400/10", border: "border-slate-400/20", text: "text-slate-300", ring: "ring-slate-400/10", bar: "bg-gradient-to-r from-slate-400 to-slate-300", badge: "bg-slate-400 text-white" },
  { bg: "bg-orange-700/10", border: "border-orange-700/20", text: "text-orange-400", ring: "ring-orange-700/10", bar: "bg-gradient-to-r from-orange-700 to-orange-500", badge: "bg-orange-700 text-white" },
];

function TargetHistoryDialog({ targetId, metricType }: { targetId: number; metricType: string }) {
  const { data: history, isLoading } = useTargetHistory(targetId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="View history">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {metricType.replace(/_/g, " ")} — History
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-3 pt-2">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {history && history.length === 0 && (
            <div className="py-6">
              <EmptyCalendarIllustration className="mx-auto mb-4 h-32 w-32 opacity-95" />
              <p className="text-sm text-muted-foreground text-center">No changes recorded yet.</p>
            </div>
          )}
          {history?.map((h) => (
            <div key={h.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
              <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                <AvatarImage src={resolveImageUrl(h.changedBy?.image)} />
                <AvatarFallback className="text-[9px]">{getInitials(h.changedBy?.name ?? "")}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  <span className="font-medium">{h.changedBy?.name}</span>{" "}
                  changed <span className="font-medium">{h.field}</span>{" "}
                  from <span className="text-muted-foreground">{h.oldValue ?? ""}</span>{" "}
                  to <span className="font-medium">{h.newValue ?? ""}</span>
                </p>
                {h.createdAt && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(h.createdAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TargetsPage() {
  const { data: session } = useSession();
  const { data: myTargets, isLoading: targetsLoading } = useMyTargets();
  const { data: leaderboard, isLoading: leaderboardLoading } = useTargetLeaderboard();
  const { data: rawEmployees } = useHrEmployees();
  const employees = Array.isArray(rawEmployees) ? rawEmployees : rawEmployees?.data ?? [];
  const createTarget = useCreateTarget();

  const userRole = session?.user?.role ?? "";
  const isAdmin = ADMIN_ROLES.includes(userRole);

  const directReports = useMemo(() => {
    if (!employees || !session?.user?.id) return [];
    return employees.filter((e: { reportingTo?: string | null }) => e.reportingTo === session.user.id);
  }, [employees, session?.user?.id]);

  const canSetTargets = isAdmin || directReports.length > 0;

  const assignableEmployees = useMemo(
    () => (isAdmin ? employees : directReports),
    [isAdmin, employees, directReports],
  );

  const handleCreateTarget = useCallback(async (data: {
    userIds: string[];
    metricType: string;
    targetValue: string;
    period: string;
    startDate: string;
    endDate: string;
    notes?: string;
  }) => {
    if (data.userIds.length === 0) {
      toast.error("Please select at least one team member");
      return;
    }
    try {
      await createTarget.mutateAsync(data);
      toast.success(`Target created for ${data.userIds.length} member${data.userIds.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to create target");
    }
  }, [createTarget]);

  if (targetsLoading || leaderboardLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-28" />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-7 w-1/2" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-36" />
          <Card>
            <CardContent className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Targets & Leaderboard"
      subtitle="Track daily targets and team performance rankings"
      actions={canSetTargets ? (
        <CreateTargetSheet
          assignableEmployees={assignableEmployees}
          isPending={createTarget.isPending}
          onSubmit={handleCreateTarget}
        />
      ) : undefined}
    >
      <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
        {myTargets && myTargets.length > 0 && (
          <motion.div variants={fadeUp}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-gold" />
              My Targets
            </h2>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {myTargets.map((target) => {
                const progress = Number(target.targetValue) > 0
                  ? Math.min(100, Math.round((Number(target.currentValue ?? 0) / Number(target.targetValue)) * 100))
                  : 0;
                const config = METRIC_ICONS[target.metricType] || { icon: BarChart3, color: "text-muted-foreground" };
                const MetricIcon = config.icon;
                return (
                  <Card key={target.id} className="shadow-noir overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted/50">
                            <MetricIcon className={cn("h-4 w-4", config.color)} />
                          </div>
                          <div>
                            <p className="text-sm font-medium capitalize">{target.metricType.replace(/_/g, " ")}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{target.period}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <TargetHistoryDialog targetId={target.id} metricType={target.metricType} />
                          <Badge variant="outline" className="text-xs">{progress}%</Badge>
                        </div>
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-2xl font-bold tabular-nums">{Number(target.currentValue ?? 0)}</span>
                        <span className="text-sm text-muted-foreground">/ {Number(target.targetValue)}</span>
                      </div>
                      <div
                        className="h-2 rounded-full bg-muted overflow-hidden"
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${target.metricType} progress`}
                      >
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            progress >= 100 ? "bg-emerald-500" :
                            progress >= 75 ? "bg-gold" :
                            progress >= 50 ? "bg-amber-500" : "bg-blue-500",
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                        <span>{target.startDate}</span>
                        <span>{target.endDate}</span>
                      </div>
                      {target.notes && (
                        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 italic">
                          {target.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {myTargets && myTargets.length === 0 && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-noir">
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center gap-4">
                  <EmptyTargetIllustration className="w-40 h-40" />
                  <div>
                    <p className="text-base font-medium text-foreground">No targets assigned yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 max-w-md mx-auto">
                      {canSetTargets
                        ? "Use the Set Target button above to add daily, weekly, or monthly goals for your team."
                        : "Your admin will set targets for you. Once they do, you'll see your progress visualized here."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            Team Leaderboard
          </h2>
          {leaderboard && leaderboard.length > 0 ? (
            <Card className="shadow-noir">
              <CardContent className="p-4">
                <div className="space-y-2">
                  {leaderboard.map((member, i) => {
                    const isTop3 = i < 3;
                    const style = isTop3 ? RANK_STYLES[i] : null;
                    return (
                      <motion.div
                        key={member.userId}
                        className={cn(
                          "relative rounded-xl p-4 transition-colors",
                          isTop3
                            ? cn("border", style?.bg, style?.border, "ring-1", style?.ring)
                            : "border border-border/50 bg-muted/30",
                        )}
                        variants={slideInLeft}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0",
                            isTop3 ? cn(style?.bg, style?.text) : "bg-muted text-muted-foreground",
                          )}>
                            {isTop3 ? (
                              <>
                                <Medal className={cn("h-5 w-5", style?.text)} />
                                <span className={cn("absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold", style?.badge)}>
                                  {i + 1}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-bold">{i + 1}</span>
                            )}
                          </div>
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={resolveImageUrl(member.image)} />
                            <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className={cn("text-sm font-semibold truncate", isTop3 ? style?.text : "text-foreground")}>
                                {member.name}
                              </p>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn("text-sm font-bold tabular-nums", isTop3 ? style?.text : "text-foreground")}>
                                  {member.progress}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({member.totalCurrent}/{member.totalTarget})
                                </span>
                              </div>
                            </div>
                            <div
                              className="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden"
                              role="progressbar"
                              aria-valuenow={member.progress}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${member.name} target progress`}
                            >
                              <motion.div
                                className={cn("h-full rounded-full", isTop3 ? style?.bar : "bg-muted-foreground/40")}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, member.progress)}%` }}
                                transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-noir">
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center gap-4">
                  <EmptyLeaderboardIllustration className="w-40 h-40" />
                  <div>
                    <p className="text-base font-medium text-foreground">No leaderboard data yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 max-w-md mx-auto">
                      Targets need to be set for team members first. Once your team starts tracking activity,
                      their rankings will appear here.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
