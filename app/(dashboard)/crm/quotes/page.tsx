"use client";

import { useState, useCallback, useTransition, memo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyDocumentsIllustration, EmptySearchIllustration } from "@/components/illustrations";
import type { Tone } from "@/lib/design/tones";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuotes, useCreateQuote, type Quote } from "@/lib/api/hooks/quotes";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { Plus, Search, Download, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { MinLengthHint } from "@/components/ui/min-length-hint";

const STATUS_TONES: Record<string, Tone> = {
  DRAFT: "neutral",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "warning",
};


interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

function createLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, taxRate: 0 };
}

interface LineItemRowProps {
  item: LineItem;
  idx: number;
  isFirst: boolean;
  canRemove: boolean;
  onUpdate: (idx: number, field: string, value: string | number) => void;
  onRemove: (idx: number) => void;
}

const LineItemRow = memo(function LineItemRow({ item, idx, isFirst, canRemove, onUpdate, onRemove }: LineItemRowProps) {
  const handleDescription = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "description", e.target.value), [onUpdate, idx]);
  const handleQuantity = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "quantity", Number(e.target.value)), [onUpdate, idx]);
  const handleUnitPrice = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "unitPrice", Number(e.target.value)), [onUpdate, idx]);
  const handleTaxRate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "taxRate", Number(e.target.value)), [onUpdate, idx]);
  const handleRemove = useCallback(() => onRemove(idx), [onRemove, idx]);

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-12 sm:col-span-5">
        {isFirst && <span className="text-xs text-muted-foreground">Description</span>}
        <Input value={item.description} onChange={handleDescription} placeholder="Item description" />
      </div>
      <div className="col-span-3 sm:col-span-2">
        {isFirst && <span className="text-xs text-muted-foreground">Qty</span>}
        <Input type="number" min={0} value={item.quantity} onChange={handleQuantity} />
      </div>
      <div className="col-span-3 sm:col-span-2">
        {isFirst && <span className="text-xs text-muted-foreground">Price</span>}
        <Input type="number" min={0} value={item.unitPrice} onChange={handleUnitPrice} />
      </div>
      <div className="col-span-3 sm:col-span-2">
        {isFirst && <span className="text-xs text-muted-foreground">Tax %</span>}
        <Input type="number" min={0} value={item.taxRate} onChange={handleTaxRate} />
      </div>
      <div className="col-span-3 flex justify-end sm:col-span-1">
        <Button type="button" variant="ghost" size="icon" onClick={handleRemove} disabled={!canRemove} aria-label="Remove line item">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
});


function CreateQuoteForm({ onSuccess }: { onSuccess: () => void }) {
  const createQuote = useCreateQuote();
  const [subject, setSubject] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([createLineItem()]);

  const addLine = useCallback(() => setLineItems((prev) => [...prev, createLineItem()]), []);

  const updateLine = useCallback((idx: number, field: string, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }, []);

  const removeLine = useCallback((idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubjectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value), []);
  const handleValidUntilChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setValidUntil(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);

  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !validUntil || lineItems.some((li) => !li.description)) {
      toast.error("Please fill all required fields");
      return;
    }
    const invalidLine = lineItems.some(
      (li) =>
        !Number.isFinite(li.quantity) ||
        li.quantity < 1 ||
        !Number.isFinite(li.unitPrice) ||
        li.unitPrice < 0 ||
        !Number.isFinite(li.taxRate) ||
        li.taxRate < 0 ||
        li.taxRate > 100
    );
    if (invalidLine) {
      toast.error("Line items must have quantity >= 1, non-negative price, and tax rate between 0 and 100");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(validUntil) < today) {
      toast.error("Valid until date cannot be in the past");
      return;
    }
    createQuote.mutate(
      {
        subject,
        validUntil,
        notes: notes || undefined,
        lineItems: lineItems.map(({ description, quantity, unitPrice, taxRate }) => ({
          description,
          quantity,
          unitPrice,
          taxRate,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Quote created successfully");
          onSuccess();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-3 sm:col-span-2">
          <Label>Subject *</Label>
          <Input value={subject} onChange={handleSubjectChange} placeholder="Quote subject" />
        </div>
        <div>
          <Label>Valid Until *</Label>
          <Input type="date" value={validUntil} onChange={handleValidUntilChange} />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Line Items</Label>
        <div className="space-y-2">
          {lineItems.map((item, idx) => (
            <LineItemRow
              key={item.id}
              item={item}
              idx={idx}
              isFirst={idx === 0}
              canRemove={lineItems.length > 1}
              onUpdate={updateLine}
              onRemove={removeLine}
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addLine} className="mt-2">
          <Plus className="size-3.5" /> Add Line
        </Button>
        <p className="mt-2 text-right text-sm font-medium tabular-nums">
          Subtotal: INR {total.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={handleNotesChange} rows={2} />
      </div>

      <Button type="submit" className="w-full" loading={createQuote.isPending} disabled={createQuote.isPending}>
        {createQuote.isPending ? "Creating..." : "Create Quote"}
      </Button>
    </form>
  );
}


export default function QuotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const search = searchParams.get("q") || "";
  const debouncedSearch = useDebouncedValue(search, 300);
  const apiSearch = debouncedSearch.length >= 3 || debouncedSearch.length === 0 ? debouncedSearch : "";
  const statusFilter = searchParams.get("status") || "all";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data, isLoading, isError, error, refetch } = useQuotes({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: apiSearch || undefined,
  });

  const [createOpen, setCreateOpen] = useState(false);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => updateParams({ q: e.target.value }),
    [updateParams],
  );

  const handleStatusFilter = useCallback(
    (v: string) => updateParams({ status: v === "all" ? null : v }),
    [updateParams],
  );

  const handleCreateOpenChange = useCallback((open: boolean) => setCreateOpen(open), []);
  const handleCreateSuccess = useCallback(() => setCreateOpen(false), []);

  return (
    <PageWrapper
      title="Quotes"
      subtitle="Create and manage sales quotes for your deals"
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/quotes/export" download>
              <Download className="size-4" />
              Export CSV
            </a>
          </Button>
          <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                New Quote
              </Button>
            </DialogTrigger>
            <DialogContent size="lg">
              <DialogHeader>
                <DialogTitle>Create Quote</DialogTitle>
              </DialogHeader>
              <CreateQuoteForm onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>
        </>
      }
      filters={
        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
            <Input
              type="search"
              data-page-search
              placeholder="Search quotes"
              value={search}
              onChange={handleSearchChange}
              className="pl-9"
              aria-label="Search quotes"
              aria-describedby="quotes-search-hint"
            />
            <MinLengthHint id="quotes-search-hint" value={search} />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isError ? (
        <QueryErrorState title="Couldn't load quotes" error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !data?.quotes?.length ? (
        search || statusFilter !== "all" ? (
          <EmptyState
            illustration={<EmptySearchIllustration className="size-32" />}
            title="No results for these filters"
            action={{ label: "Clear filters", onClick: () => updateParams({ q: null, status: null }) }}
          />
        ) : (
          <EmptyState
            illustration={<EmptyDocumentsIllustration className="size-32" />}
            title="No quotes found"
            description="Create your first quote to start closing deals."
            action={{ label: "New Quote", onClick: () => setCreateOpen(true) }}
          />
        )
      ) : (
        <div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <Link href={`/crm/quotes/${q.id}`} className="font-mono text-sm text-brand-text hover:underline">
                      {q.quoteNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/crm/quotes/${q.id}`} className="font-medium hover:underline">
                      {q.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={STATUS_TONES[q.status] ?? "neutral"} dot>
                      {q.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {q.deal?.name || ""}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {q.currency} {Number(q.netAmount).toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {q.validUntil ? format(new Date(q.validUntil), "dd MMM yyyy") : ""}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {q.createdAt ? format(new Date(q.createdAt), "dd MMM yyyy") : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
