import {
  Receipt,
  Plane,
  UtensilsCrossed,
  Car,
  Monitor,
  Armchair,
  BookOpen,
  Megaphone,
  Zap,
  Package,
} from "lucide-react";

export const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  Travel:            { icon: Plane,           label: "Travel",    bg: "bg-blue-50 dark:bg-blue-900/20",     text: "text-blue-600 dark:text-blue-400" },
  Meals:             { icon: UtensilsCrossed, label: "Meals",     bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400" },
  Transport:         { icon: Car,             label: "Transport", bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400" },
  Software:          { icon: Monitor,         label: "Software",  bg: "bg-teal-50 dark:bg-teal-900/20",     text: "text-teal-600 dark:text-teal-400" },
  "Office Supplies": { icon: Armchair,        label: "Office",    bg: "bg-gray-100 dark:bg-gray-800/30",    text: "text-gray-600 dark:text-gray-400" },
  Equipment:         { icon: Package,         label: "Equipment", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400" },
  Training:          { icon: BookOpen,        label: "Training",  bg: "bg-cyan-50 dark:bg-cyan-900/20",     text: "text-cyan-600 dark:text-cyan-400" },
  Marketing:         { icon: Megaphone,       label: "Marketing", bg: "bg-pink-50 dark:bg-pink-900/20",     text: "text-pink-600 dark:text-pink-400" },
  Utilities:         { icon: Zap,             label: "Utilities", bg: "bg-amber-50 dark:bg-amber-900/20",   text: "text-amber-600 dark:text-amber-400" },
};

export const ADMIN_CATEGORY_LABELS: Record<string, string> = {
  Travel: "Travel & Transport",
  Meals: "Meals & Entertainment",
  Transport: "Travel & Transport",
  Software: "Software & Tools",
  "Office Supplies": "Office Supplies",
};

export const DEFAULT_CATEGORY = {
  icon: Receipt,
  label: "Other",
  bg: "bg-slate-100 dark:bg-slate-800/30",
  text: "text-slate-600 dark:text-slate-400",
};

export function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY;
}

export const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  PENDING:  { dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20",    text: "text-amber-700 dark:text-amber-400",   border: "border-amber-200 dark:border-amber-800" },
  APPROVED: { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  REJECTED: { dot: "bg-red-500",     bg: "bg-red-50 dark:bg-red-900/20",         text: "text-red-700 dark:text-red-400",         border: "border-red-200 dark:border-red-800" },
  PAID:     { dot: "bg-slate-500",   bg: "bg-slate-100 dark:bg-slate-800/20",    text: "text-slate-600 dark:text-slate-400",     border: "border-slate-200 dark:border-slate-700" },
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

export const EXPENSE_CATEGORIES = [
  "Travel", "Meals", "Office Supplies", "Software",
  "Equipment", "Training", "Marketing", "Utilities", "Other",
];

export const PAYMENT_METHODS = [
  "Cash", "Company Card", "Personal Card", "Bank Transfer", "UPI",
  "Online", "Offline", "Cheque", "NEFT", "IMPS",
  "Debit Card", "Credit Card", "Wallet", "Demand Draft", "Other",
];

export type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "PAID";

export const EXPENSE_PAGE_SIZE_DEFAULT = 10;

export const EXPENSE_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export type ExpensePageSizeOption = (typeof EXPENSE_PAGE_SIZE_OPTIONS)[number];

const PAGE_SIZES_NUM = EXPENSE_PAGE_SIZE_OPTIONS as readonly number[];

export function clampExpensePageSize(n: number): ExpensePageSizeOption {
  const v = Number(n);
  if (PAGE_SIZES_NUM.includes(v)) return v as ExpensePageSizeOption;
  return EXPENSE_PAGE_SIZE_DEFAULT;
}
