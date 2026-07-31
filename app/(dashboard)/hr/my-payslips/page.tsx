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
import { format, parseISO } from "date-fns";
import { Download, FileText, Loader2, ArrowLeft } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
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

  const { data: payslips, isLoading } = useHrEmployeePayslips({});

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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageWrapper
      title="My Payslips"
      subtitle="View and download your salary slips"
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleGoBack}
            className="h-9 w-9"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]" aria-label="Select payslip month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent className="z-50">
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

      {!selectedMonth ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <EmptyDocumentsIllustration className="mb-3 mx-auto" />
            <p className="text-muted-foreground font-medium">Select a month to view your payslip</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Choose a month from the dropdown above, or open a recent payslip below. Only finalized
              (PAID) payrolls can be downloaded.
            </p>
          </CardContent>
        </Card>
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
                <Download className="mr-2 h-4 w-4" />
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
              className="flex items-center justify-center rounded-lg border bg-muted/20"
              style={{ minHeight: 400 }}
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <span className="sr-only">Loading payslip preview</span>
            </div>
          )}
          {previewError && !previewLoading && (
            <Card className="border-destructive/40">
              <CardContent className="py-8 text-center text-sm text-destructive">
                {previewError}
              </CardContent>
            </Card>
          )}
          {previewHtml && !previewLoading && (
            <iframe
              srcDoc={previewHtml}
              className="w-full border-0 rounded-lg shadow-md bg-white"
              style={{ minHeight: "860px" }}
              title={`Payslip for ${format(parseISO(selectedPayslip.month + "-01"), "MMMM yyyy")}`}
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <EmptyDocumentsIllustration className="mb-3 mx-auto" />
            <p className="text-muted-foreground font-medium">No finalized payslip for this month</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your payslip appears here only after payroll for that month has been marked PAID. If you
              expected a slip, confirm with HR that processing is complete.
            </p>
          </CardContent>
        </Card>
      )}

      {payslips && payslips.length > 0 && !selectedMonth && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payslips.slice(0, 6).map((payslip) => (
                <div
                  key={payslip.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
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
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">
                        {format(parseISO(payslip.month + "-01"), "MMMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {payslip.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold text-green-600">
                        ₹{parseFloat(payslip.netSalary || "0").toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Net Salary</p>
                    </div>
                    {payslip.status === "PAID" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        aria-label={`Download PDF for ${format(parseISO(payslip.month + "-01"), "MMMM yyyy")}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownload(payslip);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
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
