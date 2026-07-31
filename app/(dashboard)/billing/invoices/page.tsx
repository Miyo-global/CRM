"use client";

import Link from "next/link";
import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  useInvoices,
  useInvoiceStats,
  useUpdateInvoice,
  useDeleteInvoice,
  useCreateInvoice,
} from "@/lib/api/hooks/invoice";
import { format } from "date-fns";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus,
  FileText,
  Send,
  Check,
  Clock,
  Ban,
  Loader2,
  MoreHorizontal,
  Trash2,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { formatCurrencyFull } from "@/lib/format-utils";
import type { InvoiceStatus } from "@/types/invoice";
import type { Invoice } from "@/types/invoice";

const formatCurrency = (amount: number | string) => formatCurrencyFull(amount);

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof FileText }
> = {
  DRAFT: { label: "Draft", variant: "secondary", icon: FileText },
  SENT: { label: "Sent", variant: "default", icon: Send },
  PAID: { label: "Paid", variant: "default", icon: Check },
  OVERDUE: { label: "Overdue", variant: "destructive", icon: Clock },
  CANCELLED: { label: "Cancelled", variant: "outline", icon: Ban },
};

export default function InvoicesPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <InvoicesContent />
    </DashboardGate>
  );
}

function InvoicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const statusFilter = searchParams.get("status") || "all";

  const setStatusFilter = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("status");
    else params.set("status", value);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [searchParams, router, pathname]);

  const { data: invoicesData, isLoading } = useInvoices(
    statusFilter !== "all" ? { status: statusFilter as InvoiceStatus } : undefined
  );
  const { data: stats } = useInvoiceStats();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const invoices = invoicesData?.items ?? [];

  const handleUpdateStatus = useCallback((id: number, status: InvoiceStatus) => {
    updateInvoice.mutate(
      { id, status },
      { onSuccess: () => toast.success("Invoice status updated"), onError: (err) => toast.error(err.message) }
    );
  }, [updateInvoice]);

  const handleDeleteInvoice = useCallback((id: number) => {
    deleteInvoice.mutate(id, {
      onSuccess: () => toast.success("Invoice deleted"),
      onError: (err) => toast.error(err.message),
    });
  }, [deleteInvoice]);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const filtersBar = (
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Filter status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="DRAFT">Draft</SelectItem>
        <SelectItem value="SENT">Sent</SelectItem>
        <SelectItem value="PAID">Paid</SelectItem>
        <SelectItem value="OVERDUE">Overdue</SelectItem>
        <SelectItem value="CANCELLED">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <PageWrapper
      title="Invoices"
      subtitle="Manage and track all invoices"
      actions={
        <Button onClick={handleOpenCreate} className="gap-2 bg-gold hover:bg-gold/90 text-white">
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      }
      filters={filtersBar}
    >
      <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalOutstanding ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{(stats?.sent ?? 0) + (stats?.overdue ?? 0)} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <Check className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalPaid ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{stats?.paid ?? 0} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.overdue ?? 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.draft ?? 0}</div>
            <p className="text-xs text-muted-foreground">Ready to send</p>
          </CardContent>
        </Card>
      </div>

      <div className="border border-border rounded-lg overflow-auto h-[calc(100dvh-20rem)] min-h-[320px]">
        <div className="min-w-[700px]">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      compact
                      illustration={<EmptyDocumentsIllustration className="h-32 w-32 opacity-95" />}
                      title="No invoices yet"
                      description="Create your first invoice to get started."
                      action={{ label: "New Invoice", onClick: handleOpenCreate }}
                      className="border-0 bg-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <InvoiceTableRow
                    key={inv.id}
                    inv={inv}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteInvoice}
                  />
                ))
              )}
            </TableBody>
          </table>
        </div>
      </div>

      <CreateInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </PageWrapper>
  );
}

interface InvoiceTableRowProps {
  inv: Invoice;
  onUpdateStatus: (id: number, status: InvoiceStatus) => void;
  onDelete: (id: number) => void;
}

function InvoiceTableRow({ inv, onUpdateStatus, onDelete }: InvoiceTableRowProps) {
  const config = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.DRAFT;
  const handleMarkSent = useCallback(() => onUpdateStatus(inv.id, "SENT"), [inv.id, onUpdateStatus]);
  const handleMarkPaid = useCallback(() => onUpdateStatus(inv.id, "PAID"), [inv.id, onUpdateStatus]);
  const handleMarkCancelled = useCallback(() => onUpdateStatus(inv.id, "CANCELLED"), [inv.id, onUpdateStatus]);
  const handleDelete = useCallback(() => onDelete(inv.id), [inv.id, onDelete]);

  return (
    <TableRow>
      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
      <TableCell>{inv.client?.name ?? ""}</TableCell>
      <TableCell className="font-semibold">{formatCurrency(inv.total)}</TableCell>
      <TableCell>
        <Badge variant={config.variant} className="gap-1 text-xs">
          <config.icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </TableCell>
      <TableCell>{inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : ""}</TableCell>
      <TableCell className="text-muted-foreground text-xs">{inv.createdAt ? format(new Date(inv.createdAt), "MMM d") : ""}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/billing/invoices/${inv.id}`}>View Detail</Link>
            </DropdownMenuItem>
            {inv.status === "DRAFT" && (
              <DropdownMenuItem onClick={handleMarkSent}>
                <Send className="h-3.5 w-3.5 mr-2" /> Mark as Sent
              </DropdownMenuItem>
            )}
            {(inv.status === "SENT" || inv.status === "OVERDUE") && (
              <DropdownMenuItem onClick={handleMarkPaid}>
                <Check className="h-3.5 w-3.5 mr-2" /> Mark as Paid
              </DropdownMenuItem>
            )}
            {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
              <DropdownMenuItem onClick={handleMarkCancelled} className="text-destructive">
                <Ban className="h-3.5 w-3.5 mr-2" /> Cancel
              </DropdownMenuItem>
            )}
            {inv.status !== "PAID" && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

const createLineItem = (): LineItem => ({
  id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  description: "",
  quantity: 1,
  rate: 0,
  amount: 0,
});

interface LineItemRowProps {
  item: LineItem;
  idx: number;
  onUpdate: (idx: number, field: string, value: string | number) => void;
  onRemove: (idx: number) => void;
  disabled: boolean;
}

function LineItemRow({ item, idx, onUpdate, onRemove, disabled }: LineItemRowProps) {
  const handleDescChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "description", e.target.value), [idx, onUpdate]);
  const handleQtyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "quantity", Number(e.target.value)), [idx, onUpdate]);
  const handleRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "rate", Number(e.target.value)), [idx, onUpdate]);
  const handleRemove = useCallback(() => onRemove(idx), [idx, onRemove]);

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <Input className="col-span-5 h-9 text-sm" placeholder="Description" value={item.description} onChange={handleDescChange} />
      <Input className="col-span-2 h-9 text-sm text-right" type="number" placeholder="Qty" value={item.quantity || ""} onChange={handleQtyChange} />
      <Input className="col-span-2 h-9 text-sm text-right" type="number" placeholder="Rate" value={item.rate || ""} onChange={handleRateChange} />
      <div className="col-span-2 text-sm font-medium text-right pr-1">{formatCurrency(item.amount)}</div>
      <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={handleRemove} disabled={disabled} aria-label="Remove line item">
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

function CreateInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createInvoice = useCreateInvoice();
  const [lineItems, setLineItems] = useState<LineItem[]>([createLineItem()]);
  const [taxRate, setTaxRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const updateLineItem = useCallback((idx: number, field: string, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = Number(updated.quantity) * Number(updated.rate);
        }
        return updated;
      })
    );
  }, []);

  const removeLineItem = useCallback((idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, createLineItem()]);
  }, []);

  const handleTaxRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTaxRate(Number(e.target.value)), []);
  const handleDiscountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDiscount(Number(e.target.value)), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value), []);
  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;

  const handleSubmit = useCallback(() => {
    const validItems = lineItems.filter((i) => i.description.trim() && i.amount > 0);
    if (validItems.length === 0) { toast.error("Add at least one line item"); return; }
    if (discount < 0) { toast.error("Discount cannot be negative"); return; }
    if (discount > subtotal + taxAmount) { toast.error("Discount cannot exceed the invoice subtotal plus tax"); return; }
    createInvoice.mutate(
      { lineItems: validItems, taxRate, discount, dueDate: dueDate || undefined, notes: notes || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setLineItems([createLineItem()]);
          toast.success("Invoice created");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [lineItems, taxRate, discount, subtotal, taxAmount, dueDate, notes, createInvoice, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Line Items</Label>
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <LineItemRow key={item.id} item={item} idx={idx} onUpdate={updateLineItem} onRemove={removeLineItem} disabled={lineItems.length === 1} />
              ))}
              <Button variant="outline" size="sm" onClick={handleAddLineItem}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Tax Rate (%)</Label>
              <Input type="number" value={taxRate} onChange={handleTaxRateChange} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Discount</Label>
              <Input type="number" value={discount} onChange={handleDiscountChange} className="h-9 mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Due Date</Label>
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="Select due date" />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Input placeholder="Payment terms, bank details, etc." value={notes} onChange={handleNotesChange} className="h-9 mt-1" />
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span>{formatCurrency(taxAmount)}</span></div>
            {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-500">-{formatCurrency(discount)}</span></div>}
            <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createInvoice.isPending} className="bg-gold hover:bg-gold/90 text-white">
              {createInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
              Create Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
