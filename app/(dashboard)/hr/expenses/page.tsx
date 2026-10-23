"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useExpensePageData,
  useUpdateExpenseStatus,
  useDeleteExpense,
  useHrEmployees,
} from "@/lib/api/hooks/hr";
import { CreateExpenseDialog } from "./create-expense-dialog";
import { ImportExpenseSheet } from "./import-expense-sheet";
import ExpensesLoading from "./loading";
import { ExpenseExportDialog } from "@/components/expenses/expense-export-dialog";
import {
  useExpenseFilters,
  useDebouncedValue,
} from "@/hooks/use-expense-filters";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  EXPENSE_PAGE_SIZE_DEFAULT,
  clampExpensePageSize,
  type StatusFilter,
} from "@/features/hr/expenses/expense-constants";
import {
  AdminExpenseStats,
  MemberExpenseStats,
} from "@/features/hr/expenses/expense-stats";
import {
  AdminExpenseFilters,
  MemberExpenseFilters,
} from "@/features/hr/expenses/expense-filters";
import { ExpenseSearchFilters } from "@/features/hr/expenses/expense-search-filters";
import {
  AdminExpenseList,
  MemberExpenseList,
} from "@/features/hr/expenses/expense-list";
import type { ExpenseToEdit } from "./create-expense-dialog";
import type { ExpenseWithRelations } from "@/server/actions/expense-query";

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseToEdit | null>(
    null,
  );
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>("ALL");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const isAdmin =
    session?.user?.role === "CEO" ||
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "HR";

  const { filters, setFilter, setDatePreset, datePreset, activeFilterCount } =
    useExpenseFilters({ syncToUrl: true });

  const { data: employeesRaw } = useHrEmployees(undefined, { enabled: isAdmin });
  const employees = Array.isArray(employeesRaw)
    ? employeesRaw
    : (employeesRaw as { data?: { id: string; firstName?: string | null; lastName?: string | null; name?: string | null; email?: string | null }[] } | null)?.data ?? [];

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const setStatusFilter = useCallback(
    (s: StatusFilter) => {
      setStatusFilterState(s);
      setFilter("status", s === "ALL" ? "all" : s);
    },
    [setFilter],
  );

  const {
    data: pageData,
    isLoading,
    isError,
    error,
    refetch,
  } = useExpensePageData({
    page: filters.page,
    pageSize: clampExpensePageSize(filters.pageSize ?? EXPENSE_PAGE_SIZE_DEFAULT),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder as "asc" | "desc" | undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
    month: filters.month,
    status:
      filters.status &&
      filters.status !== "all" &&
      !Array.isArray(filters.status)
        ? filters.status
        : undefined,
    category: filters.category,
    categoryId: filters.categoryId,
    search:
      debouncedSearch && debouncedSearch.trim().length >= 3
        ? debouncedSearch.trim()
        : undefined,
    userId: filters.userId,
    paymentMethod: filters.paymentMethod,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
  });

  const updateStatusMutation = useUpdateExpenseStatus();
  const deleteMutation = useDeleteExpense();

  const handleApprove = useCallback(
    (expenseId: number) => {
      toast.promise(
        updateStatusMutation.mutateAsync({ expenseId, status: "APPROVED" }),
        {
          loading: "Approving expense...",
          success: () => {
            void refetch();
            return "Expense approved";
          },
          error: "Failed to approve expense",
        },
      );
    },
    [updateStatusMutation, refetch],
  );

  // Approved expenses had no way to be recorded as reimbursed (QA-0044).
  const handleMarkPaid = useCallback(
    (expenseId: number) => {
      toast.promise(
        updateStatusMutation.mutateAsync({ expenseId, status: "PAID" }),
        {
          loading: "Marking as reimbursed...",
          success: () => {
            void refetch();
            return "Expense marked as reimbursed";
          },
          error: "Failed to update expense",
        },
      );
    },
    [updateStatusMutation, refetch],
  );

  const handleReject = useCallback(
    (expenseId: number) => {
      if (!rejectionReason.trim()) return;
      toast.promise(
        updateStatusMutation.mutateAsync({
          expenseId,
          status: "REJECTED",
          rejectionReason,
        }),
        {
          loading: "Rejecting expense...",
          success: () => {
            setRejectingId(null);
            setRejectionReason("");
            void refetch();
            return "Expense rejected";
          },
          error: "Failed to reject expense",
        },
      );
    },
    [updateStatusMutation, rejectionReason, refetch],
  );

  const handleDelete = useCallback(
    (expenseId: number) => {
      toast.promise(deleteMutation.mutateAsync(expenseId), {
        loading: "Withdrawing claim...",
        success: () => {
          void refetch();
          return "Claim withdrawn";
        },
        error: (e) => getErrorMessage(e),
      });
    },
    [deleteMutation, refetch],
  );

  const handleEdit = useCallback((expense: ExpenseToEdit) => {
    setEditingExpense(expense);
    setIsCreateOpen(true);
  }, []);

  const handleResubmit = useCallback((expense: ExpenseWithRelations) => {
    setIsCreateOpen(true);
    toast.info(
      expense.rejectionReason
        ? `Rejected: ${expense.rejectionReason}. Please create a new claim with corrections.`
        : "Please create a new claim with corrections.",
    );
  }, []);

  if (isLoading && !pageData) return <ExpensesLoading />;

  const {
    expenses = [],
    pendingExpenses = [],
    stats = null,
    pagination = {
      page: 1,
      pageSize: EXPENSE_PAGE_SIZE_DEFAULT,
      total: 0,
      totalPages: 0,
    },
    categories: rawCategories = [],
  } = pageData ?? {};

  const expenseCategories =
    (
      rawCategories as {
        id: number;
        name: string;
        description: string | null;
        budgetLimit: string | null;
        budgetPeriod: string | null;
        isActive: boolean | null;
      }[]
    ).length > 0
      ? (rawCategories as {
          id: number;
          name: string;
          description: string | null;
          budgetLimit: string | null;
          budgetPeriod: string | null;
          isActive: boolean | null;
        }[])
      : EXPENSE_CATEGORIES.map((name, i) => ({
          id: i + 1,
          name,
          description: null,
          budgetLimit: null,
          budgetPeriod: null,
          isActive: true,
        }));

  const typedExpenses = expenses as ExpenseWithRelations[];
  const typedPending = pendingExpenses as ExpenseWithRelations[];

  const filteredExpenses =
    statusFilter === "ALL"
      ? typedExpenses
      : typedExpenses.filter((e) => (e.status || "PENDING") === statusFilter);

  const pendingCount = stats?.pendingCount || typedPending.length || 0;
  const totalPages = pagination.totalPages || 1;
  const startItem =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  if (isAdmin) {
    return (
      <PageWrapper
        title="Expenses"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="size-4" aria-hidden="true" />
              Import
            </Button>
            <ExpenseExportDialog
              filters={filters}
              categories={expenseCategories}
              employees={employees}
              trigger={
                <Button variant="outline" className="gap-2">
                  <Download className="size-4" aria-hidden="true" />
                  Export Report
                </Button>
              }
            />
            <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              New Expense
            </Button>
          </div>
        }
        noInternalScroll
      >
        <div
          className="flex h-full min-h-0 flex-col gap-6"
        >
          <div>
            <AdminExpenseStats stats={stats} pendingCount={pendingCount} />
          </div>
          <div>
            <AdminExpenseFilters
              statusFilter={statusFilter}
              pendingCount={pendingCount}
              onStatusChange={setStatusFilter}
              spentByUserId={filters.userId}
              onSpentByChange={(id) => setFilter("userId", id)}
              employees={employees}
            />
          </div>
          <div>
            <ExpenseSearchFilters
              search={filters.search ?? ""}
              minAmount={filters.minAmount}
              maxAmount={filters.maxAmount}
              onSearchChange={(v) => setFilter("search", v)}
              onMinAmountChange={(v) => setFilter("minAmount", v)}
              onMaxAmountChange={(v) => setFilter("maxAmount", v)}
              employees={employees}
              selectedUserId={filters.userId}
              onEmployeeChange={(v) => setFilter("userId", v)}
              hideEmployeeFilter
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isError ? (
              <QueryErrorState title="Couldn't load expenses" error={error} onRetry={() => void refetch()} />
            ) : (
            <AdminExpenseList
              expenses={filteredExpenses}
              pagination={pagination}
              startItem={startItem}
              endItem={endItem}
              totalPages={totalPages}
              statusFilter={statusFilter}
              rejectingId={rejectingId}
              rejectionReason={rejectionReason}
              isPending={updateStatusMutation.isPending}
              currentUserId={session?.user?.id}
              currentUserRole={session?.user?.role}
              onApprove={handleApprove}
              onMarkPaid={handleMarkPaid}
              onEdit={handleEdit}
              onWithdraw={handleDelete}
              onRejectStart={(id) => {
                setRejectingId(id);
                setRejectionReason("");
              }}
              onRejectConfirm={handleReject}
              onRejectCancel={() => {
                setRejectingId(null);
                setRejectionReason("");
              }}
              onRejectionReasonChange={setRejectionReason}
              onPageChange={(page) => setFilter("page", page)}
              onPageSizeChange={(size) =>
                setFilter("pageSize", clampExpensePageSize(size))
              }
              onShowAll={() => setStatusFilter("ALL")}
            />
            )}
          </div>
        </div>

        <CreateExpenseDialog
          open={isCreateOpen}
          onOpenChange={(v) => {
            setIsCreateOpen(v);
            if (!v) setEditingExpense(null);
          }}
          onSuccess={() => {
            void refetch();
            setIsCreateOpen(false);
            setEditingExpense(null);
          }}
          categories={EXPENSE_CATEGORIES}
          paymentMethods={PAYMENT_METHODS}
          editExpense={editingExpense}
          employees={employees.filter((e) => e.id !== session?.user?.id)}
        />
        <ImportExpenseSheet
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          onSuccess={() => void refetch()}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Expenses"

      actions={
        <Button
          className="gap-2"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          Submit New Claim
        </Button>
      }
    >
      <div
        className="space-y-6"
      >
        <div>
          <MemberExpenseStats stats={stats} />
        </div>
        <div>
          <MemberExpenseFilters
            statusFilter={statusFilter}
            datePreset={datePreset}
            filters={filters}
            categories={expenseCategories}
            onStatusChange={setStatusFilter}
            onDatePresetChange={setDatePreset}
          />
        </div>
        <div>
          {isError ? (
            <QueryErrorState title="Couldn't load expenses" error={error} onRetry={() => void refetch()} />
          ) : (
          <MemberExpenseList
            expenses={filteredExpenses}
            pagination={pagination}
            startItem={startItem}
            endItem={endItem}
            totalPages={totalPages}
            statusFilter={statusFilter}
            activeFilterCount={activeFilterCount}
            onEdit={handleEdit}
            onWithdraw={handleDelete}
            onResubmit={handleResubmit}
            onShowAll={() => setStatusFilter("ALL")}
            onCreateNew={() => setIsCreateOpen(true)}
            onPageChange={(page) => setFilter("page", page)}
            onPageSizeChange={(size) =>
              setFilter("pageSize", clampExpensePageSize(size))
            }
          />
          )}
        </div>
      </div>

      <CreateExpenseDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          void refetch();
          setIsCreateOpen(false);
        }}
        categories={EXPENSE_CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
      />
    </PageWrapper>
  );
}
