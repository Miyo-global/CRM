"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateInvoice } from "@/lib/api/hooks/invoice";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

const CURRENCY_CODES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED", "JPY"];

function fmt(amount: number) {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const createInvoice = useCreateInvoice();

  const [lineItems, setLineItems] = useState([
    { description: "", quantity: 1, rate: 0, amount: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("INR");

  const updateItem = (idx: number, field: string, value: string | number) => {
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
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;

  const handleSubmit = () => {
    const validItems = lineItems.filter((i) => i.description.trim() && i.amount > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    if (discount > subtotal + taxAmount) {
      toast.error("Discount cannot exceed the invoice subtotal plus tax");
      return;
    }
    createInvoice.mutate(
      {
        lineItems: validItems,
        taxRate,
        discount,
        currency,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: (inv) => {
          toast.success("Invoice created");
          router.push(`/billing/invoices/${inv.id}`);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <PageWrapper
      title="New Invoice"
      subtitle="Create a new invoice for a client"
      actions={
        <Link href="/billing/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
          </Button>
        </Link>
      }
    >
      <div className="max-w-3xl space-y-6">

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Line Items</p>
          </div>
          <div className="p-4 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-5">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>
            {lineItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-5 h-8 text-sm"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                />
                <Input
                  className="col-span-2 h-8 text-sm text-right"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={item.quantity || ""}
                  onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                  aria-label={`Quantity for item ${idx + 1}`}
                />
                <Input
                  className="col-span-2 h-8 text-sm text-right"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={item.rate || ""}
                  onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                  aria-label={`Rate for item ${idx + 1}`}
                />
                <div className="col-span-2 text-sm font-medium text-right pr-1">
                  {fmt(item.amount)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-span-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setLineItems((p) => p.filter((_, i) => i !== idx))}
                  disabled={lineItems.length === 1}
                  aria-label={`Remove item ${idx + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                setLineItems((p) => [
                  ...p,
                  { description: "", quantity: 1, rate: 0, amount: 0 },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
            </Button>
          </div>
          <div className="px-4 py-3 border-t border-border space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({taxRate}%)</span>
              <span>{fmt(taxAmount)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span className="text-destructive">-{fmt(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1.5 border-t border-border">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <p className="text-sm font-semibold">Invoice Settings</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="tax-rate" className="text-xs">Tax Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                min={0}
                max={100}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="discount" className="text-xs">Discount (₹)</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                max={subtotal + taxAmount}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="due-date" className="text-xs">Due Date</Label>
              <DatePicker id="due-date" value={dueDate} onChange={setDueDate} placeholder="Select due date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency" className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" className="h-8 text-sm">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes / Payment Terms</Label>
            <Input
              id="notes"
              placeholder="e.g. Payment due within 30 days. Bank: HDFC, A/C: 1234567890"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/billing/invoices">
            <Button variant="outline" size="sm">Cancel</Button>
          </Link>
          <Button size="sm" onClick={handleSubmit} disabled={createInvoice.isPending}>
            {createInvoice.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <FileText className="h-3.5 w-3.5 mr-1" />
            )}
            Create Invoice
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
