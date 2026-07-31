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
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const STATUS_BADGE: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "default" },
  PAID: { label: "Paid", variant: "outline" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  const { data: invoice, isLoading } = useInvoice(id);
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
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (!invoice) {
    return (
      <PageWrapper title="Invoice">
        <p className="text-muted-foreground py-8 text-center">Invoice not found.</p>
      </PageWrapper>
    );
  }

  const badge = STATUS_BADGE[invoice.status];
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
      doc.setDrawColor(189, 136, 44);
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
      subtitle={invoice.client?.name ?? "No client"}
      badge={<Badge variant={badge.variant}>{badge.label}</Badge>}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "DRAFT" && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          )}
          {invoice.status === "DRAFT" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate("SENT")} disabled={updateInvoice.isPending}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Mark Sent
            </Button>
          )}
          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
            <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Payment
            </Button>
          )}
          {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate("CANCELLED")} disabled={updateInvoice.isPending}>
              <Ban className="h-3.5 w-3.5 mr-1.5" /> Cancel
            </Button>
          )}
          {invoice.status === "PAID" && outstanding <= 0 && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <Check className="h-4 w-4" /> Fully Paid
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
          </Button>
          <Link href="/billing/invoices">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 max-w-3xl">

        <div className="rounded-lg border border-border bg-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Invoice #</p>
            <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Created</p>
            <p>{format(new Date(invoice.createdAt), "dd MMM yyyy")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
            <p>{invoice.dueDate ? format(new Date(invoice.dueDate), "dd MMM yyyy") : ""}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Currency</p>
            <p>{invoice.currency}</p>
          </div>
          {invoice.client && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Client</p>
              <p className="font-medium">{invoice.client.name}</p>
            </div>
          )}
          {invoice.project && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Project</p>
              <p>{invoice.project.name}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Line Items</p>
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
                  <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(item.rate)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmt(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 py-3 border-t border-border space-y-1.5 text-sm">
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
            <div className="flex justify-between font-bold text-base pt-1.5 border-t border-border">
              <span>Total</span><span>{fmt(invoice.total)}</span>
            </div>
            {totalPaid > 0 && (
              <>
                <div className="flex justify-between text-emerald-600">
                  <span>Paid</span><span>{fmt(totalPaid)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Outstanding</span><span>{fmt(Math.max(0, outstanding))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </div>
        )}

        {(invoice.payments ?? []).length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">Payment History</p>
              {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Payment
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
                    <TableCell className="text-sm">
                      {format(new Date(p.paymentDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {p.paymentMethod.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {p.referenceNumber ?? ""}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-600">
                      {fmt(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold">Line Items</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Amount</span>
                </div>
                {editLineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-5 h-8 text-sm"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => setEditLineItems((prev) => prev.map((li, i) => i === idx ? { ...li, description: e.target.value } : li))}
                    />
                    <Input
                      className="col-span-2 h-8 text-sm text-right"
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
                      className="col-span-2 h-8 text-sm text-right"
                      type="number" min={0}
                      value={item.rate || ""}
                      onChange={(e) => setEditLineItems((prev) => prev.map((li, i) => {
                        if (i !== idx) return li;
                        const rate = Number(e.target.value);
                        return { ...li, rate, amount: li.quantity * rate };
                      }))}
                      aria-label={`Rate for item ${idx + 1}`}
                    />
                    <div className="col-span-2 text-sm font-medium text-right pr-1">
                      {fmt(item.amount)}
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="col-span-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setEditLineItems((p) => p.filter((_, i) => i !== idx))}
                      disabled={editLineItems.length === 1}
                      aria-label={`Remove item ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline" size="sm" className="mt-1"
                  onClick={() => setEditLineItems((p) => [...p, { description: "", quantity: 1, rate: 0, amount: 0 }])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input type="number" min={0} max={100} value={editTaxRate} onChange={(e) => setEditTaxRate(Number(e.target.value))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Discount (₹)</Label>
                <Input type="number" min={0} value={editDiscount} onChange={(e) => setEditDiscount(Number(e.target.value))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <DatePicker value={editDueDate} onChange={setEditDueDate} placeholder="Select due date" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Currency</Label>
                <Input value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)} className="h-8 text-sm" placeholder="INR" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes / Payment Terms</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="h-8 text-sm" placeholder="e.g. Payment due within 30 days" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={updateInvoice.isPending}
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
              {updateInvoice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="pay-amount" className="text-xs">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                placeholder={`Max: ${fmt(Math.max(0, outstanding))}`}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-date" className="text-xs">Payment Date</Label>
              <DatePicker
                id="pay-date"
                value={paymentForm.paymentDate}
                onChange={(v) => setPaymentForm((p) => ({ ...p, paymentDate: v }))}
                placeholder="Select payment date"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Method</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(v) => setPaymentForm((p) => ({ ...p, paymentMethod: v as PaymentMethod }))}
              >
                <SelectTrigger className="h-8 text-xs" aria-label="Payment method">
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
              <Label htmlFor="pay-ref" className="text-xs">Reference Number</Label>
              <Input
                id="pay-ref"
                placeholder="UTR, cheque #, etc."
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNumber: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-notes" className="text-xs">Notes</Label>
              <Input
                id="pay-notes"
                placeholder="Optional"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRecordPayment} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
