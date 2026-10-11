"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  Send,
  Check,
  Ban,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailLayout } from "@/components/shared/detail-header";
import { PropertyList } from "@/components/shared/property-list";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { INVOICE_STATUS } from "../../invoice-status";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { useInvoice, useUpdateInvoice, useRecordPayment } from "@/lib/api/hooks/invoice";
import type { InvoiceStatus, PaymentMethod } from "@/types/invoice";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

function fmt(amount: string | number) {
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ALLOWED_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  const id = Number(invoiceId);

  const { data: invoice, isLoading, error, refetch } = useInvoice(id);
  const updateInvoice = useUpdateInvoice();
  const recordPayment = useRecordPayment();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "bank_transfer" as PaymentMethod,
    referenceNumber: "",
    notes: "",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [editLineItems, setEditLineItems] = useState<{ description: string; quantity: number; rate: number; amount: number }[]>([]);
  const [editTaxRate, setEditTaxRate] = useState(0);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCurrency, setEditCurrency] = useState("INR");

  const editInitializedRef = useRef(false);

  useEffect(() => {
    if (!editOpen) {
      editInitializedRef.current = false;
      return;
    }
    if (invoice && !editInitializedRef.current) {
      editInitializedRef.current = true;
      setEditLineItems(invoice.lineItems.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        rate: Number(i.rate),
        amount: Number(i.amount),
      })));
      setEditTaxRate(Number(invoice.taxRate ?? 0));
      setEditDiscount(Number(invoice.discount ?? 0));
      setEditDueDate(invoice.dueDate ? format(new Date(invoice.dueDate), "yyyy-MM-dd") : "");
      setEditNotes(invoice.notes ?? "");
      setEditCurrency(invoice.currency ?? "INR");
    }
  }, [editOpen, invoice]);

  if (isLoading) {
    return (
      <PageWrapper title="Invoice">
        <DetailLayout
          main={<Skeleton className="h-80 rounded-lg" />}
          rail={<Skeleton className="h-64 rounded-lg" />}
        />
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Invoice">
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  if (!invoice) {
    return (
      <PageWrapper title="Invoice">
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="h-32 w-32" />}
          title="Invoice not found."
          action={{ label: "Back", href: "/billing/invoices" }}
        />
      </PageWrapper>
    );
  }

  const status = INVOICE_STATUS[invoice.status];
  const totalPaid = (invoice.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Number(invoice.total) - totalPaid;

  const handleStatusUpdate = (status: InvoiceStatus) => {
    if (!ALLOWED_STATUS_TRANSITIONS[invoice.status]?.includes(status)) {
      toast.error(`Cannot change status from ${invoice.status.toLowerCase()} to ${status.toLowerCase()}`);
      return;
    }
    updateInvoice.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(`Invoice marked as ${status.toLowerCase()}`),
        onError: () => toast.error("Failed to update status"),
      }
    );
  };

  const handleDownloadPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("INVOICE", 20, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Miyo Global", 20, 33);
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 20, 40);
      doc.text(`Date: ${format(new Date(invoice.createdAt), "dd MMM yyyy")}`, 20, 47);
      if (invoice.dueDate) {
        doc.text(`Due: ${format(new Date(invoice.dueDate), "dd MMM yyyy")}`, 20, 54);
      }
      doc.setDrawColor(212, 175, 55);
      doc.line(20, 60, 190, 60);
      if (invoice.client) {
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text(`Bill To: ${invoice.client.name}`, 20, 70);
      }
      doc.setFontSize(10);
      doc.setTextColor(100);
      let y = 85;
      doc.text("Description", 20, y);
      doc.text("Qty", 110, y);
      doc.text("Rate", 135, y);
      doc.text("Amount", 165, y);
      doc.line(20, y + 3, 190, y + 3);
      y += 10;
      doc.setTextColor(0);
      for (const item of invoice.lineItems) {
        doc.text(item.description, 20, y);
        doc.text(String(item.quantity), 110, y);
        doc.text(fmt(item.rate), 135, y);
        doc.text(fmt(item.amount), 165, y);
        y += 8;
      }
      doc.line(20, y + 2, 190, y + 2);
      y += 10;
      doc.text(`Subtotal: ${fmt(invoice.subtotal)}`, 130, y); y += 7;
      if (Number(invoice.taxRate)) doc.text(`Tax (${invoice.taxRate}%): ${fmt(invoice.taxAmount ?? 0)}`, 130, y), (y += 7);
      doc.setFontSize(13);
      doc.text(`Total: ${fmt(invoice.total)}`, 130, y);
      if (invoice.notes) {
        y += 15;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Notes: ${invoice.notes}`, 20, y);
      }
      doc.save(`${invoice.invoiceNumber}.pdf`);
      toast.success("Invoice PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const handleRecordPayment = () => {
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > outstanding) { toast.error(`Payment cannot exceed the outstanding balance of ${fmt(Math.max(0, outstanding))}`); return; }
    recordPayment.mutate(
      {
        invoiceId: id,
        amount,
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Payment recorded");
          setPaymentOpen(false);
          setPaymentForm({
            amount: "",
            paymentDate: format(new Date(), "yyyy-MM-dd"),
            paymentMethod: "bank_transfer",
            referenceNumber: "",
            notes: "",
          });
        },
        onError: () => toast.error("Failed to record payment"),
      }
    );
  };

  return (
    <PageWrapper
      title={invoice.invoiceNumber}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusPill tone={status.tone} dot>{status.label}</StatusPill>
          {invoice.client?.name ?? "No client"}
        </span>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" asChild>
            <Link href="/billing/invoices">
              <ArrowLeft aria-hidden="true" /> Back
            </Link>
          </Button>
          {invoice.status === "DRAFT" && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden="true" /> Edit
            </Button>
          )}
          {invoice.status === "DRAFT" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate("SENT")} loading={updateInvoice.isPending}>
              {!updateInvoice.isPending && <Send aria-hidden="true" />} Mark Sent
            </Button>
          )}
          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              <Plus aria-hidden="true" /> Record Payment
            </Button>
          )}
          {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
            <Button size="sm" variant="outline" onClick={() => setConfirmCancelOpen(true)} disabled={updateInvoice.isPending}>
              <Ban aria-hidden="true" /> Cancel
            </Button>
          )}
          {invoice.status === "PAID" && outstanding <= 0 && (
            <StatusPill tone="success">
              <Check className="size-3" aria-hidden="true" /> Fully Paid
            </StatusPill>
          )}
          <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
            <Download aria-hidden="true" /> Download PDF
          </Button>
        </div>
      }
    >
      <DetailLayout
        rail={
          <Card className="gap-4 p-5">
            <h2 className="font-sans text-sm font-semibold tracking-normal">Details</h2>
            <PropertyList
              items={[
                { label: "Invoice #", value: <span className="font-mono">{invoice.invoiceNumber}</span> },
                { label: "Created", value: <span className="tabular-nums">{format(new Date(invoice.createdAt), "dd MMM yyyy")}</span> },
                { label: "Due Date", value: invoice.dueDate ? <span className="tabular-nums">{format(new Date(invoice.dueDate), "dd MMM yyyy")}</span> : null },
                { label: "Currency", value: invoice.currency },
                ...(invoice.client ? [{ label: "Client", value: <span className="font-medium">{invoice.client.name}</span> }] : []),
                ...(invoice.project ? [{ label: "Project", value: invoice.project.name }] : []),
              ]}
            />
          </Card>
        }
        main={
      <div className="space-y-6">
        <Card className="gap-0 overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-sans text-sm font-semibold tracking-normal">Line Items</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-20">Qty</TableHead>
                <TableHead className="text-right w-28">Rate</TableHead>
                <TableHead className="text-right w-28">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item, i) => (
                <TableRow key={`${i}-${item.description}-${item.rate}-${item.quantity}`}>
                  <TableCell className="text-sm">{item.description}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{fmt(item.rate)}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{fmt(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="space-y-1.5 border-t border-border bg-surface-sunken/40 px-5 py-4 text-sm tabular-nums">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
            </div>
            {Number(invoice.taxRate) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({invoice.taxRate}%)</span><span>{fmt(invoice.taxAmount ?? 0)}</span>
              </div>
            )}
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span><span className="text-destructive">-{fmt(invoice.discount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1.5 font-display text-lg font-bold text-foreground">
              <span>Total</span><span>{fmt(invoice.total)}</span>
            </div>
            {totalPaid > 0 && (
              <>
                <div className="flex justify-between text-success-strong">
                  <span>Paid</span><span>{fmt(totalPaid)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Outstanding</span><span>{fmt(Math.max(0, outstanding))}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {invoice.notes && (
          <Card className="gap-1 px-5 py-4">
            <h2 className="font-sans text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h2>
            <p className="text-sm text-foreground">{invoice.notes}</p>
          </Card>
        )}

        {(invoice.payments ?? []).length > 0 && (
          <Card className="gap-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-sans text-sm font-semibold tracking-normal">Payment History</h2>
              {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
                  <Plus aria-hidden="true" /> Add Payment
                </Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.payments ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm tabular-nums">
                      {format(new Date(p.paymentDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {p.paymentMethod.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {p.referenceNumber ?? ""}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums text-success-strong">
                      {fmt(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
        }
      />

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancel invoice"
        description="This marks the invoice as cancelled. This action cannot be undone."
        confirmLabel="Cancel invoice"
        destructive
        onConfirm={() => { setConfirmCancelOpen(false); handleStatusUpdate("CANCELLED"); }}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold">Line Items</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="hidden grid-cols-12 gap-2 px-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Amount</span>
                </div>
                {editLineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-12 sm:col-span-5"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => setEditLineItems((prev) => prev.map((li, i) => i === idx ? { ...li, description: e.target.value } : li))}
                    />
                    <Input
                      className="col-span-4 text-right tabular-nums sm:col-span-2"
                      type="number" min={1}
                      value={item.quantity || ""}
                      onChange={(e) => setEditLineItems((prev) => prev.map((li, i) => {
                        if (i !== idx) return li;
                        const qty = Number(e.target.value);
                        return { ...li, quantity: qty, amount: qty * li.rate };
                      }))}
                      aria-label={`Quantity for item ${idx + 1}`}
                    />
                    <Input
                      className="col-span-4 text-right tabular-nums sm:col-span-2"
                      type="number" min={0}
                      value={item.rate || ""}
                      onChange={(e) => setEditLineItems((prev) => prev.map((li, i) => {
                        if (i !== idx) return li;
                        const rate = Number(e.target.value);
                        return { ...li, rate, amount: li.quantity * rate };
                      }))}
                      aria-label={`Rate for item ${idx + 1}`}
                    />
                    <div className="col-span-2 pr-1 text-right text-sm font-medium tabular-nums">
                      {fmt(item.amount)}
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="col-span-2 justify-self-end text-muted-foreground hover:text-destructive sm:col-span-1"
                      onClick={() => setEditLineItems((p) => p.filter((_, i) => i !== idx))}
                      disabled={editLineItems.length === 1}
                      aria-label={`Remove item ${idx + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline" size="sm" className="mt-1"
                  onClick={() => setEditLineItems((p) => [...p, { description: "", quantity: 1, rate: 0, amount: 0 }])}
                >
                  <Plus aria-hidden="true" /> Add Item
                </Button>
              </div>
              <div className="px-4 py-3 border-t border-border space-y-1 text-sm">
                {(() => {
                  const sub = editLineItems.reduce((s, i) => s + i.amount, 0);
                  const tax = sub * (editTaxRate / 100);
                  const total = sub + tax - editDiscount;
                  return (
                    <>
                      <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmt(sub)}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>Tax ({editTaxRate}%)</span><span>{fmt(tax)}</span></div>
                      {editDiscount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="text-destructive">-{fmt(editDiscount)}</span></div>}
                      <div className="flex justify-between font-bold border-t border-border pt-1.5"><span>Total</span><span>{fmt(total)}</span></div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Tax Rate (%)</Label>
                <Input type="number" min={0} max={100} value={editTaxRate} onChange={(e) => setEditTaxRate(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Discount (₹)</Label>
                <Input type="number" min={0} value={editDiscount} onChange={(e) => setEditDiscount(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <DatePicker value={editDueDate} onChange={setEditDueDate} placeholder="Select due date" />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)} placeholder="INR" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes / Payment Terms</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="e.g. Payment due within 30 days" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              loading={updateInvoice.isPending}
              onClick={() => {
                const validItems = editLineItems.filter((i) => i.description.trim() && i.amount > 0);
                if (validItems.length === 0) { toast.error("Add at least one line item"); return; }
                const editSubtotal = validItems.reduce((s, i) => s + i.amount, 0);
                const editTaxAmount = editSubtotal * (editTaxRate / 100);
                if (editDiscount < 0) { toast.error("Discount cannot be negative"); return; }
                if (editDiscount > editSubtotal + editTaxAmount) { toast.error("Discount cannot exceed the invoice subtotal plus tax"); return; }
                updateInvoice.mutate(
                  {
                    id,
                    lineItems: validItems,
                    taxRate: editTaxRate,
                    discount: editDiscount,
                    currency: editCurrency,
                    dueDate: editDueDate || undefined,
                    notes: editNotes || undefined,
                  },
                  {
                    onSuccess: () => { toast.success("Invoice updated"); setEditOpen(false); },
                    onError: () => toast.error("Failed to update invoice"),
                  }
                );
              }}
            >
              {!updateInvoice.isPending && <Check aria-hidden="true" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="pay-amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                placeholder={`Max: ${fmt(Math.max(0, outstanding))}`}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
               
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-date">Payment Date</Label>
              <DatePicker
                id="pay-date"
                value={paymentForm.paymentDate}
                onChange={(v) => setPaymentForm((p) => ({ ...p, paymentDate: v }))}
                placeholder="Select payment date"
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(v) => setPaymentForm((p) => ({ ...p, paymentMethod: v as PaymentMethod }))}
              >
                <SelectTrigger className="w-full" aria-label="Payment method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-ref">Reference Number</Label>
              <Input
                id="pay-ref"
                placeholder="UTR, cheque #, etc."
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-notes">Notes</Label>
              <Input
                id="pay-notes"
                placeholder="Optional"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} loading={recordPayment.isPending}>
              {!recordPayment.isPending && <Check aria-hidden="true" />}
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
