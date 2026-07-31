"use client";

import { useState } from "react";
import {
  Plus,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  PieChart,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrencyFull as formatCurrency } from "@/lib/format-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useHrExpenseCategories, useCreateExpenseCategory } from "@/lib/api/hooks/hr/leaves-expenses";

interface BudgetManagementProps {
  onClose?: () => void;
}

export function BudgetManagement({ onClose }: BudgetManagementProps) {
  const { data: categories = [], isLoading: loading } = useHrExpenseCategories();
  const createCategoryMutation = useCreateExpenseCategory();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    budgetLimit: "",
    budgetPeriod: "MONTHLY" as "MONTHLY" | "YEARLY",
  });

  const handleCreateCategory = () => {
    if (!newCategory.name) {
      toast.error("Category name is required");
      return;
    }

    toast.promise(
      createCategoryMutation.mutateAsync({
        name: newCategory.name,
        description: newCategory.description || undefined,
        budgetLimit: newCategory.budgetLimit ? parseFloat(newCategory.budgetLimit) : undefined,
        budgetPeriod: newCategory.budgetPeriod,
      }),
      {
        loading: "Creating category...",
        success: () => {
          setIsCreateOpen(false);
          setNewCategory({ name: "", description: "", budgetLimit: "", budgetPeriod: "MONTHLY" });
          return "Category created successfully";
        },
        error: "Failed to create category",
      }
    );
  };

  const getUsagePercentage = (spent: number, limit: number) => {
    if (!limit) return 0;
    return Math.min((spent / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const totalBudget = categories.reduce((sum, s) => sum + (parseFloat(s.budgetLimit ?? "0") || 0), 0);
  const totalSpent = categories.reduce((sum, s) => sum + s.totalSpent, 0);
  const totalPending = categories.reduce((sum, s) => sum + s.pendingAmount, 0);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-64 bg-slate-200 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Budget Management</h2>
          <p className="text-slate-600 mt-1">Manage expense categories and budget limits</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="">
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-slate-500 mt-1">This month&apos;s allocation</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-slate-500 mt-1">
              {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% of budget` : "No budget set"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Claims</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Category Budgets
          </CardTitle>
          <CardDescription>Monitor spending against budget limits by category</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <EmptyState
              compact
              icon={PieChart}
              title="No categories yet"
              description="Create expense categories to track budgets."
              action={{ label: "Add category", onClick: () => setIsCreateOpen(true) }}
              className="border-0 bg-transparent"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Budget Period</TableHead>
                  <TableHead className="text-right">Budget Limit</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((item) => {
                  const limit = parseFloat(item.budgetLimit ?? "0") || 0;
                  const percentage = getUsagePercentage(item.totalSpent, limit);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.budgetPeriod?.toLowerCase() || "Monthly"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {limit ? formatCurrency(limit) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {formatCurrency(item.pendingAmount)}
                      </TableCell>
                      <TableCell className="w-[150px]">
                        {limit ? (
                          <div className="space-y-1">
                            <Progress
                              value={percentage}
                              className={`h-2 ${getUsageColor(percentage)}`}
                            />
                            <span className="text-xs text-slate-500">{percentage.toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No limit</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {percentage >= 90 ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Over Budget
                          </Badge>
                        ) : percentage >= 75 ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            Warning
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            On Track
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Expense Category</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., Travel, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Brief description of this category..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetLimit">Budget Limit (₹)</Label>
                <Input
                  id="budgetLimit"
                  type="text"
                  inputMode="decimal"
                  value={newCategory.budgetLimit}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d{0,10}(\.\d{0,2})?$/.test(v)) {
                      setNewCategory({ ...newCategory, budgetLimit: v });
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetPeriod">Budget Period</Label>
                <Select
                  value={newCategory.budgetPeriod}
                  onValueChange={(value) => setNewCategory({ ...newCategory, budgetPeriod: value as "MONTHLY" | "YEARLY" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} className="flex-1">
              Create Category
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

