"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuoteDetail, useUpdateQuote, useDeleteQuote, useSendQuote } from "@/lib/api/hooks/quotes";
import { toast } from "sonner";
import { ArrowLeft, Send, CheckCircle, XCircle, Trash2, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ACCEPTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  EXPIRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

export default function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = use(params);
  const id = Number(quoteId);
  const router = useRouter();
  const { data: quote, isLoading } = useQuoteDetail(id);
  const sendQuote = useSendQuote();
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();

  const handleGoBack = useCallback(() => router.push("/crm/quotes"), [router]);

  if (isLoading) {
    return (
      <PageWrapper title="Quote">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <PageWrapper title="Quote Not Found">
        <p className="text-muted-foreground">This quote does not exist or you don&apos;t have access.</p>
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
      doc.setTextColor(15, 43, 127);
      doc.text("QUOTE", 20, 25);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Quote #: ${quote.quoteNumber}`, 20, 35);
      doc.text(`Date: ${quote.createdAt ? format(new Date(quote.createdAt), "dd MMM yyyy") : ""}`, 20, 42);
      doc.text(`Valid Until: ${quote.validUntil ? format(new Date(quote.validUntil), "dd MMM yyyy") : ""}`, 20, 49);
      doc.text(`Status: ${quote.status}`, 20, 56);

      doc.setDrawColor(189, 136, 44);
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
      doc.setTextColor(189, 136, 44);
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

  return (
    <PageWrapper
      title={quote.quoteNumber}
      subtitle={quote.subject}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          {quote.status === "DRAFT" && (
            <Button size="sm" onClick={handleSend} disabled={sendQuote.isPending}>
              <Send className="mr-2 h-4 w-4" /> Send Quote
            </Button>
          )}
          {quote.status === "SENT" && (
            <>
              <Button size="sm" variant="default" onClick={handleAccept} disabled={updateQuote.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> Accept
              </Button>
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={updateQuote.isPending}>
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive">
                <Trash2 className="h-4 w-4" />
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
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
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
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{Number(item.unitPrice).toLocaleString(DEFAULT_LOCALE)}</TableCell>
                      <TableCell className="text-right">{item.taxRate}%</TableCell>
                      <TableCell className="text-right font-medium">{Number(item.amount).toLocaleString(DEFAULT_LOCALE)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 border-t pt-4 space-y-1 text-right">
                <p className="text-sm text-muted-foreground">
                  Subtotal: {quote.currency} {Number(quote.totalAmount).toLocaleString(DEFAULT_LOCALE)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tax: {quote.currency} {Number(quote.taxAmount).toLocaleString(DEFAULT_LOCALE)}
                </p>
                <p className="text-lg font-bold text-gold">
                  Net Total: {quote.currency} {Number(quote.netAmount).toLocaleString(DEFAULT_LOCALE)}
                </p>
              </div>
            </CardContent>
          </Card>

          {quote.termsAndConditions && (
            <Card>
              <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.termsAndConditions}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className={STATUS_COLORS[quote.status]}>{quote.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quote #</span>
                <span className="font-mono">{quote.quoteNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{quote.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Until</span>
                <span>{quote.validUntil ? format(new Date(quote.validUntil), "dd MMM yyyy") : ""}</span>
              </div>
              {quote.deal && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deal</span>
                  <span>{quote.deal.name}</span>
                </div>
              )}
              {quote.client && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span>{quote.client.clientName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created By</span>
                <span>{quote.createdBy?.name || ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{quote.createdAt ? format(new Date(quote.createdAt), "dd MMM yyyy") : ""}</span>
              </div>
              {quote.sentAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{format(new Date(quote.sentAt), "dd MMM yyyy HH:mm")}</span>
                </div>
              )}
              {quote.acceptedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accepted</span>
                  <span>{format(new Date(quote.acceptedAt), "dd MMM yyyy HH:mm")}</span>
                </div>
              )}
              {quote.rejectedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rejected</span>
                  <span>{format(new Date(quote.rejectedAt), "dd MMM yyyy HH:mm")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {quote.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
