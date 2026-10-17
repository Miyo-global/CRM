"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AtsSummary {
  openJobs: number;
  applicationsThisWeek: number;
  interviewsToday: number;
}

/** MIYO-0677: hiring at a glance, for the people who do the hiring. */
export function HiringCard() {
  const { data, isLoading } = useQuery<AtsSummary>({
    queryKey: ["ats", "summary"],
    queryFn: () => apiClient.get<AtsSummary>("/ats/summary"),
    retry: false,
  });

  if (isLoading) return <Skeleton className="h-28" />;
  if (!data) return null;

  const stats = [
    { label: "Open jobs", value: data.openJobs, href: "/ats/jobs" },
    { label: "Applied this week", value: data.applicationsThisWeek, href: "/ats/candidates" },
    { label: "Interviews today", value: data.interviewsToday, href: "/ats/interviews" },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Hiring</p>
          <Link href="/ats" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Open
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href} className="block">
              <p className="text-2xl font-semibold tabular-nums text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
