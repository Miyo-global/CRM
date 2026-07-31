"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLandingPageDetail } from "@/lib/api/hooks/marketing";

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function DailyBarChart({ data }: { data: { date: string; views: number }[] }) {
  const last14 = data.slice(-14);
  const maxVal = Math.max(...last14.map((d) => d.views), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {last14.map((d) => {
        const pct = Math.round((d.views / maxVal) * 100);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-all"
              style={{ height: `${Math.max(pct, 4)}%` }}
              title={`${d.date}: ${d.views} views`}
            />
          </div>
        );
      })}
    </div>
  );
}

function PercentBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="capitalize text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}% <span className="text-muted-foreground">({count})</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  }, [text]);
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handle} aria-label="Copy snippet">
      {copied ? <CheckIcon className="h-3 w-3 text-emerald-500" /> : <CopyIcon className="h-3 w-3" />}
    </Button>
  );
}

export function PageDetailContent({ pageId }: { pageId: number }) {
  const { data, isLoading } = useLandingPageDetail(pageId);
  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (!data) return null;
  const { page, viewsByDay, deviceBreakdown, referrerBreakdown } = data;
  const totalDevice = deviceBreakdown.reduce((s, d) => s + d.count, 0);
  const snippet = `<script>fetch('/api/marketing/landing-pages/${pageId}/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({referrer:document.referrer,deviceType:/Mobi/i.test(navigator.userAgent)?'mobile':'desktop'})});</script>`;
  return (
    <div className="mt-4 space-y-6">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Page URL</p>
        <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary underline-offset-2 hover:underline flex items-center gap-1 break-all">
          {page.url}
          <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" />
        </a>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-xl font-bold">{page.totalViews}</p>
          <p className="text-[11px] text-muted-foreground">All time</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-xl font-bold">{page.weekViews}</p>
          <p className="text-[11px] text-muted-foreground">This week</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-xl font-bold">{page.todayViews}</p>
          <p className="text-[11px] text-muted-foreground">Today</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Daily Views (last 14 days)</p>
        {viewsByDay.length > 0 ? <DailyBarChart data={viewsByDay} /> : <p className="text-xs text-muted-foreground">No view data yet.</p>}
      </div>
      {deviceBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Device Breakdown</p>
          <div className="space-y-2">
            {deviceBreakdown.map((d) => <PercentBar key={d.device} label={d.device} count={d.count} total={totalDevice} />)}
          </div>
        </div>
      )}
      {referrerBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Top Referrers</p>
          <div className="space-y-1">
            {referrerBreakdown.slice(0, 5).map((r) => (
              <div key={r.referrer} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[70%]">{r.referrer}</span>
                <span className="font-medium">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground">Tracking Snippet</p>
          <CopyButton text={snippet} />
        </div>
        <pre className="text-[10px] leading-relaxed bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">{snippet}</pre>
      </div>
    </div>
  );
}
