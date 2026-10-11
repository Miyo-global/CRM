"use client";

import Link from "next/link";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { format, isPast } from "date-fns";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { toneDot } from "@/lib/design/tones";
import { INVOICE_STATUS } from "./invoice-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { useInvoiceStats, useInvoices } from "@/lib/api/hooks/invoice";
import type { InvoiceStatus } from "@/types/invoice";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

function fmt(amount: string | number) {
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function BillingPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <BillingContent />
    </DashboardGate>
  );
}

function BillingContent() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useInvoiceStats();
  const { data: recentData, isLoading: recentLoading } = useInvoices({ limit: 5 });
  const { data: overdueData } = useInvoices({ status: "OVERDUE", limit: 5 });

  const recentInvoices = recentData?.items ?? [];
  const overdueInvoices = overdueData?.items ?? [];

  return (
    <PageWrapper
      title="Billing & Finance"
      subtitle="Track invoices, payments, and revenue"
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing/invoices">All Invoices</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/billing/invoices/new">
              <Plus aria-hidden="true" />
              New Invoice
            </Link>
          </Button>
        </>
      }
    >
      {statsError ? (
        <QueryErrorState error={statsError} onRetry={() => refetchStats()} />
      ) : (
      <div className="grid grid-cols-12 gap-4 xl:gap-6">
        {[
          { label: "Total Invoiced", value: fmt(stats ? (stats.totalOutstanding + stats.totalPaid) : 0), icon: FileText, tone: "info" as const },
          { label: "Received (Paid)", value: fmt(stats?.totalPaid ?? 0), icon: CheckCircle2, tone: "success" as const },
          { label: "Outstanding", value: fmt(stats?.totalOutstanding ?? 0), icon: Clock, tone: "brand" as const },
          { label: "Overdue", value: `${stats?.overdue ?? 0} invoices`, icon: AlertCircle, tone: "danger" as const },
        ].map((kpi, i) => (
          <div key={kpi.label} className="col-span-12 sm:col-span-6 xl:col-span-3">
            {statsLoading ? (
              <Skeleton className="h-28 rounded-lg" />
            ) : (
              <StatCard label={kpi.label} value={kpi.value} icon={kpi.icon} tone={kpi.tone} index={i} />
            )}
          </div>
        ))}

        <Card className="col-span-12 flex-row flex-wrap divide-border overflow-hidden sm:flex-nowrap sm:divide-x">
          {(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as InvoiceStatus[]).map((s) => {
            const status = INVOICE_STATUS[s];
            const count = stats?.[s.toLowerCase() as keyof typeof stats] as number ?? 0;
            return (
              <Link
                key={s}
                href={`/billing/invoices?status=${s}`}
                className="min-w-1/2 flex-1 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:focus-ring sm:min-w-0"
              >
                <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className={`size-1.5 rounded-full ${toneDot[status.tone]}`} aria-hidden="true" />
                  {status.label}
                </p>
                <p className="mt-1 font-display text-xl font-bold tabular-nums">{count}</p>
              </Link>
            );
          })}
        </Card>

        <div className={overdueInvoices.length > 0 ? "col-span-12 xl:col-span-8" : "col-span-12"}>
          <WidgetCard
            title="Recent Invoices"
            icon={FileText}
            tone="info"
            viewAllHref="/billing/invoices"
            contentClassName="px-0 pb-0"
          >
            {recentLoading ? (
              <div className="space-y-2 px-5 pb-5">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <InvoiceTable invoices={recentInvoices} />
            )}
          </WidgetCard>
        </div>

        {overdueInvoices.length > 0 && (
          <div className="col-span-12 xl:col-span-4">
            <WidgetCard
              title="Overdue Invoices"
              icon={AlertCircle}
              tone="danger"
              count={overdueInvoices.length}
              viewAllHref="/billing/invoices?status=OVERDUE"
            >
              <ul className="-mx-2">
                {overdueInvoices.map((inv) => (
                  <li key={inv.id}>
                    <WidgetListRow
                      href={`/billing/invoices/${inv.id}`}
                      title={<span className="font-mono text-xs">{inv.invoiceNumber}</span>}
                      meta={
                        <>
                          {inv.client?.name ?? ""}
                          {inv.dueDate ? ` · Due ${format(new Date(inv.dueDate), "dd MMM yyyy")}` : ""}
                        </>
                      }
                      trailing={<span className="text-sm font-medium tabular-nums">{fmt(inv.total)}</span>}
                    />
                  </li>
                ))}
              </ul>
            </WidgetCard>
          </div>
        )}
      </div>
      )}
    </PageWrapper>
  );
}

function InvoiceTable({
  invoices,
}: {
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    status: InvoiceStatus;
    total: string;
    dueDate: string | null;
    client: { id: number; name: string } | null;
    createdAt: Date;
  }>;
}) {
  if (!invoices.length) {
    return (
      <div className="px-5 pb-5">
        <EmptyState
          compact
          illustration={<EmptyExpensesIllustration className="h-24 w-24" />}
          title="No invoices found."
          action={{ label: "New Invoice", href: "/billing/invoices/new" }}
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const status = INVOICE_STATUS[inv.status];
          const overdue =
            inv.status !== "PAID" &&
            inv.status !== "CANCELLED" &&
            inv.dueDate &&
            isPast(new Date(inv.dueDate));
          return (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-xs font-medium">
                {inv.invoiceNumber}
              </TableCell>
              <TableCell className="text-sm">
                {inv.client?.name ?? null}
              </TableCell>
              <TableCell>
                <StatusPill tone={status.tone} dot>
                  {status.label}
                </StatusPill>
              </TableCell>
              <TableCell className={`text-xs tabular-nums ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {inv.dueDate ? format(new Date(inv.dueDate), "dd MMM yyyy") : ""}
              </TableCell>
              <TableCell className="text-right text-sm font-medium tabular-nums">
                {fmt(inv.total)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="xs" asChild>
                  <Link href={`/billing/invoices/${inv.id}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}
