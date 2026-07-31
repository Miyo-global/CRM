"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Target,
  ShieldCheck,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { MiniDonutChart } from "@/components/charts/mini-donut-chart";
import { ActivityFeed } from "@/components/charts/activity-feed";
import { useCrmPerson } from "@/lib/hooks/trpc-hooks";
import { formatCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getColorSafe,
  stageColors,
  healthStatusColors,
  healthDotColors,
  roleBadgeConfig,
} from "@/lib/theme-constants";

export default function PersonDetailPage() {
  const params = useParams();
  const slug = params.personSlug as string;
  const { data: person, isLoading } = useCrmPerson(slug);

  if (isLoading) {
    return (
      <PageWrapper title="Loading...">
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      </PageWrapper>
    );
  }

  if (!person) {
    return (
      <PageWrapper
        title="Person not found"
        actions={
          <Link href="/sales">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      >
        <Card>
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <EmptyPersonIllustration />
              <p className="text-sm text-muted-foreground">
                The person you&apos;re looking for doesn&apos;t exist.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  const badge = roleBadgeConfig[person.role as keyof typeof roleBadgeConfig];
  const isSalesRep = person.role === "sales_rep";
  const isCSM = person.role === "csm";

  const backHref = isCSM ? "/customer-executive" : "/sales";
  const backLabel = isCSM ? "Customer Executive" : "Sales Dashboard";

  const healthDistribution = isCSM
    ? [
        { label: "Healthy", value: person.accounts.filter((a) => a.health === "healthy").length, color: "#10B981" },
        { label: "At Risk", value: person.accounts.filter((a) => a.health === "at_risk").length, color: "#F59E0B" },
        { label: "Critical", value: person.accounts.filter((a) => a.health === "critical").length, color: "#EF4444" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <PageWrapper
      title={person.name}
      subtitle={person.title}
      actions={
        <Link href={backHref} aria-label={`Back to ${backLabel}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-primary">{person.initials}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">{person.name}</h1>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", badge?.color)}>
                    {badge?.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{person.title}</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{person.bio}</p>

                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {person.email}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {person.phone}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {person.location}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Joined {person.joinDate}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {person.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-[10px] font-normal">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {person.stats.map((stat, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              {stat.trend && (
                <p
                  className={cn(
                    "text-[10px] mt-0.5",
                    stat.trend.isPositive ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {stat.trend.isPositive ? "+" : "-"}
                  {Math.abs(stat.trend.value)}%
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isSalesRep && <TabsTrigger value="deals">Deals ({person.deals.length})</TabsTrigger>}
            {isCSM && <TabsTrigger value="accounts">Accounts ({person.accounts.length})</TabsTrigger>}
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {isSalesRep ? "Revenue Trend" : "ARR Managed Trend"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MiniAreaChart
                      data={person.monthlyPerformance}
                      color={isSalesRep ? "#3B82F6" : "#10B981"}
                      height={240}
                      formatValue={(v) =>
                        v >= 1000000
                          ? `$${(v / 1000000).toFixed(1)}M`
                          : `$${(v / 1000).toFixed(0)}K`
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-5">
                {isSalesRep && (
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Pipeline Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center py-4">
                          <p className="text-3xl font-bold text-foreground">
                            {formatCurrency(
                              person.deals
                                .filter((d) => d.stage !== "Closed Won")
                                .reduce((s, d) => s + d.value, 0)
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Active Pipeline</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-border p-3 text-center">
                            <p className="text-lg font-bold text-foreground">
                              {person.deals.filter((d) => d.stage !== "Closed Won").length}
                            </p>
                            <p className="text-xs text-muted-foreground">Open Deals</p>
                          </div>
                          <div className="rounded-xl border border-border p-3 text-center">
                            <p className="text-lg font-bold text-foreground">
                              {Math.round(
                                person.deals
                                  .filter((d) => d.stage !== "Closed Won")
                                  .reduce((s, d) => s + d.probability, 0) /
                                  Math.max(person.deals.filter((d) => d.stage !== "Closed Won").length, 1)
                              )}
                              %
                            </p>
                            <p className="text-xs text-muted-foreground">Avg Probability</p>
                          </div>
                        </div>
                        <div className="space-y-2 pt-2">
                          {Object.entries(
                            person.deals
                              .filter((d) => d.stage !== "Closed Won")
                              .reduce(
                                (acc, d) => {
                                  acc[d.stage] = (acc[d.stage] || 0) + 1;
                                  return acc;
                                },
                                {} as Record<string, number>
                              )
                          ).map(([stage, count]) => (
                            <div key={stage} className="flex items-center justify-between text-sm">
                              <span
                                className={cn(
                                  "text-xs font-medium px-2 py-0.5 rounded-full",
                                  getColorSafe(stageColors, stage)
                                )}
                              >
                                {stage}
                              </span>
                              <span className="text-muted-foreground">{count} deal{count > 1 ? "s" : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isCSM && (
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Account Health
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-4">
                      <MiniDonutChart
                        data={healthDistribution}
                        centerValue={person.accounts.length}
                        centerLabel="Accounts"
                        size={160}
                        strokeWidth={24}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed items={person.activities.slice(0, 4)} />
              </CardContent>
            </Card>
          </TabsContent>

          {isSalesRep && (
            <TabsContent value="deals" className="space-y-4">
              {person.deals.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No active deals
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {person.deals.map((deal, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                    >
                      <Card className="h-full hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-foreground">{deal.company}</p>
                              <span
                                className={cn(
                                  "text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block",
                                  getColorSafe(stageColors, deal.stage)
                                )}
                              >
                                {deal.stage}
                              </span>
                            </div>
                            <p className="text-lg font-bold text-foreground">
                              {formatCurrency(deal.value)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Close: {deal.closeDate}</span>
                            <span>{deal.probability}% probability</span>
                          </div>
                          <div
                            className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden"
                            role="progressbar"
                            aria-valuenow={deal.probability}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${deal.company} deal probability`}
                          >
                            <motion.div
                              className="h-full rounded-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${deal.probability}%` }}
                              transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {isCSM && (
            <TabsContent value="accounts" className="space-y-4">
              {person.accounts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No managed accounts
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {person.accounts.map((account, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                    >
                      <Card className="h-full hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2.5 h-2.5 rounded-full", getColorSafe(healthDotColors, account.health))} />
                              <div>
                                <p className="font-semibold text-foreground">{account.name}</p>
                                <span
                                  className={cn(
                                    "text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block capitalize",
                                    getColorSafe(healthStatusColors, account.health)
                                  )}
                                >
                                  {account.health.replace("_", " ")}
                                </span>
                              </div>
                            </div>
                            <p className="text-lg font-bold text-foreground">
                              {formatCurrency(account.revenue)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Client since {account.since}</span>
                            <span>Renewal: {account.renewalDate}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed items={person.activities} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
      </div>
    </PageWrapper>
  );
}
