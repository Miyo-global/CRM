"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { IconChip } from "@/components/ui/icon-chip";
import { DetailLayout } from "@/components/shared/detail-header";
import { PropertyList } from "@/components/shared/property-list";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import type { Tone } from "@/lib/design/tones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuoteDetail, useUpdateQuote, useDeleteQuote, useSendQuote } from "@/lib/api/hooks/quotes";
import { toast } from "sonner";
import { ArrowLeft, Send, CheckCircle, XCircle, Trash2, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const STATUS_TONES: Record<string, Tone> = {
  DRAFT: "neutral",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "warning",
};

const fmtDate = (d: string | Date | null | undefined, pattern = "dd MMM yyyy") => (d ? format(new Date(d), pattern) : "");

export default function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = use(params);
  const id = Number(quoteId);
  const router = useRouter();
  const { data: quote, isLoading, isError, error, refetch } = useQuoteDetail(id);
  const sendQuote = useSendQuote();
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();

  const handleGoBack = useCallback(() => router.push("/crm/quotes"), [router]);

  if (isLoading) {
    return (
      <PageWrapper title="Quote">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Quote">
        <QueryErrorState title="Couldn't load this quote" error={error} onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <PageWrapper title="Quote Not Found">
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="size-32" />}
          title="Quote Not Found"
          description="This quote does not exist or you don't have access."
          action={{ label: "Back", onClick: handleGoBack }}
        />
      </PageWrapper>
    );
  }

  const handleSend = () => {
    sendQuote.mutate(id, {
      onSuccess: () => toast.success("Quote sent successfully"),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleAccept = () => {
    updateQuote.mutate({ id, status: "ACCEPTED" }, {
      onSuccess: () => toast.success("Quote marked as accepted"),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleReject = () => {
    updateQuote.mutate({ id, status: "REJECTED" }, {
      onSuccess: () => toast.success("Quote marked as rejected"),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDelete = () => {
    deleteQuote.mutate(id, {
      onSuccess: () => {
        toast.success("Quote deleted");
        router.push("/crm/quotes");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDownloadPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setTextColor(32, 30, 31);
      doc.text("QUOTE", 20, 25);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Quote #: ${quote.quoteNumber}`, 20, 35);
      doc.text(`Date: ${quote.createdAt ? format(new Date(quote.createdAt), "dd MMM yyyy") : ""}`, 20, 42);
      doc.text(`Valid Until: ${quote.validUntil ? format(new Date(quote.validUntil), "dd MMM yyyy") : ""}`, 20, 49);
      doc.text(`Status: ${quote.status}`, 20, 56);

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(20, 62, 190, 62);

      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(quote.subject, 20, 72);

      if (quote.description) {
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text(quote.description, 20, 80, { maxWidth: 170 });
      }

      let y = 95;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Description", 20, y);
      doc.text("Qty", 110, y);
      doc.text("Price", 130, y);
      doc.text("Tax %", 155, y);
      doc.text("Amount", 175, y);
      y += 5;
      doc.line(20, y, 190, y);
      y += 5;

      doc.setTextColor(0);
      for (const item of quote.lineItems ?? []) {
        doc.text(item.description.substring(0, 45), 20, y);
        doc.text(String(item.quantity), 110, y);
        doc.text(Number(item.unitPrice).toLocaleString(DEFAULT_LOCALE), 130, y);
        doc.text(`${item.taxRate}%`, 155, y);
        doc.text(Number(item.amount).toLocaleString(DEFAULT_LOCALE), 175, y);
        y += 7;
      }

      y += 5;
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(`Subtotal: ${quote.currency} ${Number(quote.totalAmount).toLocaleString(DEFAULT_LOCALE)}`, 130, y);
      y += 7;
      doc.text(`Tax: ${quote.currency} ${Number(quote.taxAmount).toLocaleString(DEFAULT_LOCALE)}`, 130, y);
      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(121, 96, 1);
      doc.text(`Net Total: ${quote.currency} ${Number(quote.netAmount).toLocaleString(DEFAULT_LOCALE)}`, 130, y);

      if (quote.termsAndConditions) {
        y += 15;
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Terms & Conditions:", 20, y);
        y += 5;
        doc.text(quote.termsAndConditions, 20, y, { maxWidth: 170 });
      }

      doc.save(`${quote.quoteNumber}.pdf`);
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const money = (v: string | number | null | undefined) => `${quote.currency} ${Number(v).toLocaleString(DEFAULT_LOCALE)}`;

  return (
    <PageWrapper
      title={quote.quoteNumber}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          {quote.subject}
          <StatusPill tone={STATUS_TONES[quote.status] ?? "neutral"} dot>{quote.status}</StatusPill>
        </span>
      }
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="size-4" /> PDF
          </Button>
          {quote.status === "DRAFT" && (
            <Button size="sm" onClick={handleSend} loading={sendQuote.isPending} disabled={sendQuote.isPending}>
              <Send className="size-4" /> Send Quote
            </Button>
          )}
          {quote.status === "SENT" && (
            <>
              <Button size="sm" variant="default" onClick={handleAccept} disabled={updateQuote.isPending}>
                <CheckCircle className="size-4" /> Accept
              </Button>
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={updateQuote.isPending}>
                <XCircle className="size-4" /> Reject
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon-sm" variant="ghost" className="text-destructive hover:bg-danger-soft hover:text-destructive" aria-label="Delete quote" loading={deleteQuote.isPending}>
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Quote?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete quote {quote.quoteNumber}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    >
      <DetailLayout
        main={
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <IconChip icon={FileText} size="sm" />
                  Line Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Tax %</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(quote.lineItems ?? []).map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(item.unitPrice).toLocaleString(DEFAULT_LOCALE)}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.taxRate}%</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{Number(item.amount).toLocaleString(DEFAULT_LOCALE)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <dl className="ml-auto mt-4 max-w-xs space-y-1 border-t pt-4 text-sm tabular-nums">
                  <div className="flex justify-between gap-4 text-muted-foreground">
                    <dt>Subtotal</dt><dd>{money(quote.totalAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-muted-foreground">
                    <dt>Tax</dt><dd>{money(quote.taxAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pt-1 font-display text-lg font-bold">
                    <dt>Net Total</dt><dd>{money(quote.netAmount)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {quote.termsAndConditions && (
              <Card>
                <CardHeader><CardTitle className="text-base">Terms & Conditions</CardTitle></CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{quote.termsAndConditions}</p>
                </CardContent>
              </Card>
            )}
          </div>
        }
        rail={
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent>
                <PropertyList
                  items={[
                    { label: "Status", value: <StatusPill tone={STATUS_TONES[quote.status] ?? "neutral"} dot>{quote.status}</StatusPill> },
                    { label: "Quote #", value: <span className="font-mono">{quote.quoteNumber}</span> },
                    { label: "Currency", value: quote.currency },
                    { label: "Valid Until", value: <span className="tabular-nums">{fmtDate(quote.validUntil)}</span> },
                    ...(quote.deal ? [{ label: "Deal", value: quote.deal.name }] : []),
                    ...(quote.client ? [{ label: "Client", value: quote.client.clientName }] : []),
                    { label: "Created By", value: quote.createdBy?.name || "" },
                    { label: "Created", value: <span className="tabular-nums">{fmtDate(quote.createdAt)}</span> },
                    ...(quote.sentAt ? [{ label: "Sent", value: <span className="tabular-nums">{fmtDate(quote.sentAt, "dd MMM yyyy HH:mm")}</span> }] : []),
                    ...(quote.acceptedAt ? [{ label: "Accepted", value: <span className="tabular-nums">{fmtDate(quote.acceptedAt, "dd MMM yyyy HH:mm")}</span> }] : []),
                    ...(quote.rejectedAt ? [{ label: "Rejected", value: <span className="tabular-nums">{fmtDate(quote.rejectedAt, "dd MMM yyyy HH:mm")}</span> }] : []),
                  ]}
                />
              </CardContent>
            </Card>

            {quote.notes && (
              <Card>
                <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{quote.notes}</p>
                </CardContent>
              </Card>
            )}
          </>
        }
      />
    </PageWrapper>
  );
}
