"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHrEmployeePayslips } from "@/lib/api/hooks/hr";
import type { EmployeePayslip } from "@/types/hr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { IconChip } from "@/components/ui/icon-chip";
import { StatusPill } from "@/components/ui/status-pill";
import { format, parseISO } from "date-fns";
import { Download, FileText, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function MyPayslipsPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const handleGoBack = useCallback(() => {
    if (typeof window === "undefined") {
      router.push("/dashboard");
      return;
    }
    const keyBefore = `${window.location.pathname}${window.location.search}`;
    router.back();
    // `router.back()` is a no-op when there is no prior entry (e.g. opened from email / new tab).
    window.setTimeout(() => {
      const keyAfter = `${window.location.pathname}${window.location.search}`;
      if (keyAfter === keyBefore) {
        router.push("/dashboard");
      }
    }, 200);
  }, [router]);

  const { data: payslips, isLoading, isError, error, refetch } = useHrEmployeePayslips({});

  const selectedPayslip = payslips?.find((p) => p.month === selectedMonth);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPayslip) {
      setPreviewHtml(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewHtml(null);

    void fetch(`/api/hr/payrolls/${selectedPayslip.id}/download?toolbar=0`, {
      credentials: "include",
      signal: ac.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || res.statusText || "Could not load payslip");
        }
        return res.text();
      })
      .then((html) => {
        if (!cancelled) setPreviewHtml(html);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (!cancelled) {
          setPreviewError(e instanceof Error ? e.message : "Could not load payslip preview");
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selectedPayslip?.id]);

  const availableMonths = payslips?.map((p) => ({
    value: p.month,
    label: format(parseISO(p.month + "-01"), "MMMM yyyy"),
  })) || [];

  const handleDownload = async (payslipOverride?: EmployeePayslip) => {
    const payslip = payslipOverride ?? selectedPayslip;
    if (!payslip) return;

    toast.loading("Downloading PDF…", { id: "pdf-download" });

    try {
      const res = await fetch(
        `/api/hr/payrolls/${payslip.id}/download?format=pdf`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || res.statusText || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const employeeName = `${payslip.user?.firstName || ""}_${payslip.user?.lastName || ""}`.replace(/\s+/g, "_");
      const monthKey = payslip.month;
      const monthYear = format(parseISO(monthKey + "-01"), "MMM_yyyy");
      a.download = `Payslip_${employeeName || "employee"}_${monthYear}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Payslip downloaded successfully!", { id: "pdf-download" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to download PDF: ${errorMessage}`, { id: "pdf-download" });
    }
  };

  if (isLoading) {
    return (
      <PageWrapper title="My payslips">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-18 w-full rounded-lg" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="My payslips"
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleGoBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48" aria-label="Select payslip month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.length > 0 ? (
                availableMonths.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No payslips available
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      }
    >

      {isError ? (
        <QueryErrorState title="Couldn't load payslips" error={error} onRetry={() => refetch()} />
      ) : !selectedMonth ? (
        <EmptyState
          compact={!!payslips?.length}
          className="mb-6"
          title={payslips?.length ? "Select a month to view your payslip." : "No payslips yet."}
          description={payslips?.length ? "Only payslips marked paid can be downloaded." : undefined}
        />
      ) : selectedPayslip ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            {selectedPayslip.status === "PAID" ? (
              <Button
                onClick={() => {
                  void handleDownload();
                }}
                aria-label="Download payslip as PDF"
              >
                <Download className="size-4" aria-hidden="true" />
                Download Payslip
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Download will be available once HR finalises this payslip.
              </p>
            )}
          </div>

          {previewLoading && (
            <div
              className="flex min-h-100 items-center justify-center rounded-lg border border-border bg-surface-sunken"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="size-8 animate-spin text-brand-text motion-reduce:animate-none" aria-hidden="true" />
              <span className="sr-only">Loading payslip preview</span>
            </div>
          )}
          {previewError && !previewLoading && (
            <QueryErrorState title="Couldn't load the payslip preview" error={new Error(previewError)} className="min-h-0" />
          )}
          {previewHtml && !previewLoading && (
            <iframe
              srcDoc={previewHtml}
              className="w-full rounded-lg border border-border bg-card shadow-sm"
              style={{ minHeight: "860px" }}
              title={`Payslip for ${format(parseISO(selectedPayslip.month + "-01"), "MMMM yyyy")}`}
            />
          )}
        </div>
      ) : (
        <EmptyState
          title="No payslip for this month."
          description="A payslip appears once HR marks that month paid."
        />
      )}

      {!isError && payslips && payslips.length > 0 && !selectedMonth && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payslips.slice(0, 6).map((payslip) => (
                <div
                  key={payslip.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 outline-none transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:focus-ring"
                  role="button"
                  tabIndex={0}
                  aria-label={`View payslip for ${format(parseISO(payslip.month + "-01"), "MMMM yyyy")}`}
                  onClick={() => setSelectedMonth(payslip.month)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedMonth(payslip.month);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconChip icon={FileText} />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {format(parseISO(payslip.month + "-01"), "MMMM yyyy")}
                      </p>
                      <StatusPill tone={payslip.status === "PAID" ? "success" : payslip.status === "APPROVED" ? "info" : "neutral"} dot className="mt-1">
                        {payslip.status}
                      </StatusPill>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold tabular-nums text-success-strong">
                        ₹{parseFloat(payslip.netSalary || "0").toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Net Salary</p>
                    </div>
                    {payslip.status === "PAID" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        aria-label={`Download PDF for ${format(parseISO(payslip.month + "-01"), "MMMM yyyy")}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownload(payslip);
                        }}
                      >
                        <Download className="size-4" aria-hidden="true" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
