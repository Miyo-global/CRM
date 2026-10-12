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
import { toneDot, toneText } from "@/lib/design/tones";

// Categories are free categorical → TAG_TONE_CYCLE order (info, teal, plum, brand, warning, success).
export const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  Travel:            { icon: Plane,           label: "Travel",    bg: "bg-info-soft",    text: toneText.info },
  Meals:             { icon: UtensilsCrossed, label: "Meals",     bg: "bg-teal-soft",    text: toneText.teal },
  Transport:         { icon: Car,             label: "Transport", bg: "bg-plum-soft",    text: toneText.plum },
  Software:          { icon: Monitor,         label: "Software",  bg: "bg-brand-soft",   text: toneText.brand },
  "Office Supplies": { icon: Armchair,        label: "Office",    bg: "bg-warning-soft", text: toneText.warning },
  Equipment:         { icon: Package,         label: "Equipment", bg: "bg-success-soft", text: toneText.success },
  Training:          { icon: BookOpen,        label: "Training",  bg: "bg-info-soft",    text: toneText.info },
  Marketing:         { icon: Megaphone,       label: "Marketing", bg: "bg-teal-soft",    text: toneText.teal },
  Utilities:         { icon: Zap,             label: "Utilities", bg: "bg-plum-soft",    text: toneText.plum },
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
  bg: "bg-neutral-soft",
  text: toneText.neutral,
};

export function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY;
}

// Pill renders with a `border` class → keep the key, transparent (no pill borders).
export const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  PENDING:  { dot: toneDot.warning, bg: "bg-warning-soft", text: toneText.warning, border: "border-transparent" },
  APPROVED: { dot: toneDot.success, bg: "bg-success-soft", text: toneText.success, border: "border-transparent" },
  REJECTED: { dot: toneDot.danger,  bg: "bg-danger-soft",  text: toneText.danger,  border: "border-transparent" },
  PAID:     { dot: toneDot.success, bg: "bg-success-soft", text: toneText.success, border: "border-transparent" },
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
