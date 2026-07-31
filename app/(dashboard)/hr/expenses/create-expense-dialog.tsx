"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";
import Image from "next/image";
import { Upload, Receipt, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { useCreateExpense, useUpdateExpense } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  RECEIPT_ALLOWED_EXTENSIONS,
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_MAX_FILE_SIZE_BYTES,
  RECEIPT_UPLOAD_FORMAT_HINT,
  validateFileTypeAndSize,
} from "@/lib/files/expense-file-validation";
import {
  cleanOptionalText,
  cleanOptionalSimpleName,
  sanitizeSimpleName,
  isSimpleNameChar,
} from "@/lib/validations/text-rules";
import { expenseAmountSchema, MAX_EXPENSE_AMOUNT } from "@/lib/validations/expense";

const FIELD_LIMITS = {
  categoryOther: 50,
  paymentMethodOther: 50,
  merchant: 100,
  description: 500,
} as const;

function CharCount({ length, max }: { length: number; max: number }) {
  const atMax = length >= max;
  return (
    <p className={`text-xs text-right ${atMax ? "text-destructive font-medium" : "text-muted-foreground"}`}>
      {length}/{max}
    </p>
  );
}

function blockNonSimpleNameKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.nativeEvent.isComposing) return;
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isSimpleNameChar(e.key)) {
    e.preventDefault();
  }
}

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  categoryOther: cleanOptionalSimpleName("Category", FIELD_LIMITS.categoryOther),
  amount: expenseAmountSchema,
  description: cleanOptionalText("Description", FIELD_LIMITS.description),
  merchant: cleanOptionalSimpleName("Merchant", FIELD_LIMITS.merchant),
  paymentMethod: z.string().optional(),
  paymentMethodOther: cleanOptionalSimpleName("Payment method", FIELD_LIMITS.paymentMethodOther),
  expenseDate: z.string().min(1, "Date is required"),
}).superRefine((data, ctx) => {
  const isOtherCategory = data.category.trim().toLowerCase() === "other";
  if (isOtherCategory && !data.categoryOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the other category",
      path: ["categoryOther"],
    });
  }

  const isOtherPayment = (data.paymentMethod || "").trim().toLowerCase() === "other";
  if (isOtherPayment && !data.paymentMethodOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the other payment method",
      path: ["paymentMethodOther"],
    });
  }
});

type FormData = z.infer<typeof formSchema>;

export interface ExpenseToEdit {
  id: number;
  category: string;
  amount: number | string;
  description?: string | null;
  merchant?: string | null;
  paymentMethod?: string | null;
  expenseDate: string | Date;
  receiptUrl?: string | null;
  receiptFileName?: string | null;
}

interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: string[];
  paymentMethods: string[];
  editExpense?: ExpenseToEdit | null;
}

function formatAmountDisplay(amount: number) {
  return amount > 0 ? String(amount) : "";
}

function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = useState(() => formatAmountDisplay(value));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setDisplay(formatAmountDisplay(value));
    }
  }, [value]);

  const adjustAmount = (delta: number) => {
    const next = Math.min(MAX_EXPENSE_AMOUNT, Math.max(0, Number((value + delta).toFixed(2))));
    onChange(next);
    setDisplay(formatAmountDisplay(next));
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => adjustAmount(-100)}
        aria-label="Decrease amount by ₹100"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        aria-label="Expense amount in rupees"
        value={display}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            setDisplay("");
            onChange(0);
            return;
          }
          if (!/^\d{0,5}(\.\d{0,2})?$/.test(raw)) return;
          const num = parseFloat(raw);
          if (!isNaN(num) && num > MAX_EXPENSE_AMOUNT) return;
          setDisplay(raw);
          if (raw.endsWith(".")) return;
          onChange(isNaN(num) ? 0 : num);
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          const num = parseFloat(display);
          if (!isNaN(num) && num > 0) {
            const formatted = num % 1 === 0 ? String(num) : num.toFixed(2);
            setDisplay(formatted);
            onChange(num);
            return;
          }
          setDisplay("");
          onChange(0);
        }}
        className="text-right font-semibold"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => adjustAmount(100)}
        aria-label="Increase amount by ₹100"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function CreateExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
  categories,
  paymentMethods,
  editExpense,
}: CreateExpenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const isEditMode = !!editExpense;

  const buildDefaultValues = useCallback(
    (): FormData => ({
      category: editExpense?.category || "",
      categoryOther: "",
      amount: editExpense ? Number(editExpense.amount) : 0,
      description: editExpense?.description || "",
      merchant: editExpense?.merchant || "",
      paymentMethod: editExpense?.paymentMethod || "",
      paymentMethodOther: "",
      expenseDate: editExpense?.expenseDate
        ? format(new Date(editExpense.expenseDate), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    }),
    [editExpense],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: buildDefaultValues(),
  });

  const { reset } = form;
  const sheetSessionRef = useRef<{ open: boolean; editId?: number }>({ open: false });

  useEffect(() => {
    if (!open) {
      sheetSessionRef.current = { open: false };
      return;
    }

    const editId = editExpense?.id;
    if (sheetSessionRef.current.open && sheetSessionRef.current.editId === editId) {
      return;
    }

    sheetSessionRef.current = { open: true, editId };
    reset(buildDefaultValues());
    if (editExpense?.receiptUrl) {
      setReceiptPreview(editExpense.receiptUrl);
    } else {
      setReceiptPreview(null);
    }
    setReceiptFile(null);
  }, [open, editExpense?.id, editExpense?.receiptUrl, reset, buildDefaultValues]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFileTypeAndSize({
        file,
        allowedMimeTypes: RECEIPT_ALLOWED_MIME_TYPES,
        allowedExtensions: RECEIPT_ALLOWED_EXTENSIONS,
        maxSizeBytes: RECEIPT_MAX_FILE_SIZE_BYTES,
      });
      if (validationError) {
        toast.error(validationError);
        e.target.value = "";
        return;
      }
      setReceiptFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "receipts");

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onInvalid = useCallback(() => {
    toast.error("Please fix the highlighted fields before submitting.");
  }, []);

  const onSubmit = useCallback(async (data: FormData) => {
    setIsLoading(true);
    try {
      let receiptUrl: string | undefined;
      let receiptFileName: string | undefined;

      if (receiptFile) {
        const url = await uploadFile(receiptFile);
        if (url) {
          receiptUrl = url;
          receiptFileName = receiptFile.name;
        }
      }

      const capitalize = (s?: string) =>
        s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

      const expenseData = {
        category:
          data.category.trim().toLowerCase() === "other" && data.categoryOther?.trim()
            ? data.categoryOther.trim()
            : data.category,
        amount: data.amount,
        description: capitalize(data.description),
        merchant: capitalize(data.merchant),
        paymentMethod:
          data.paymentMethod?.trim().toLowerCase() === "other" && data.paymentMethodOther?.trim()
            ? data.paymentMethodOther.trim()
            : data.paymentMethod,
        expenseDate: formatDateOnly(new Date(data.expenseDate)),
        receiptUrl,
        receiptFileName,
      };

      if (isEditMode && editExpense) {
        await updateExpenseMutation.mutateAsync({ expenseId: editExpense.id, ...expenseData });
      } else {
        await createExpenseMutation.mutateAsync(expenseData);
      }
      toast.success(isEditMode ? "Expense updated successfully" : "Expense submitted successfully");
      reset(buildDefaultValues());
      removeFile();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [
    receiptFile,
    isEditMode,
    editExpense,
    reset,
    buildDefaultValues,
    onSuccess,
    createExpenseMutation,
    updateExpenseMutation,
  ]);

  const handleSubmit = form.handleSubmit(onSubmit, onInvalid);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Edit Expense Claim" : "New Expense Claim"}
      description="Submit an expense for reimbursement"
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? "Update Expense" : "Submit Expense"}
      isPending={isLoading || uploading || createExpenseMutation.isPending || updateExpenseMutation.isPending}
    >
      <Form {...form}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("category")?.trim().toLowerCase() === "other" && (
              <FormField
                control={form.control}
                name="categoryOther"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Specify Category</FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm"
                        placeholder="Enter category"
                        maxLength={FIELD_LIMITS.categoryOther}
                        {...field}
                        onKeyDown={blockNonSimpleNameKey}
                        onChange={(e) => field.onChange(sanitizeSimpleName(e.target.value))}
                      />
                    </FormControl>
                    <CharCount length={field.value?.length ?? 0} max={FIELD_LIMITS.categoryOther} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Amount (₹)</FormLabel>
                  <FormControl>
                    <AmountInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="expenseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      toDate={new Date()}
                      placeholder="Pick date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("paymentMethod")?.trim().toLowerCase() === "other" && (
              <FormField
                control={form.control}
                name="paymentMethodOther"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Specify Payment Method</FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm"
                        placeholder="Enter payment method"
                        maxLength={FIELD_LIMITS.paymentMethodOther}
                        {...field}
                        onKeyDown={blockNonSimpleNameKey}
                        onChange={(e) => field.onChange(sanitizeSimpleName(e.target.value))}
                      />
                    </FormControl>
                    <CharCount length={field.value?.length ?? 0} max={FIELD_LIMITS.paymentMethodOther} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={form.control}
            name="merchant"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Merchant / Vendor</FormLabel>
                <FormControl>
                  <Input
                    className="text-sm"
                    placeholder="e.g. Amazon, Uber, Hotel Taj"
                    maxLength={FIELD_LIMITS.merchant}
                    {...field}
                    onKeyDown={blockNonSimpleNameKey}
                    onChange={(e) => field.onChange(sanitizeSimpleName(e.target.value))}
                  />
                </FormControl>
                <CharCount length={field.value?.length ?? 0} max={FIELD_LIMITS.merchant} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Description</FormLabel>
                <FormControl>
                  <Textarea
                    className="text-sm resize-none"
                    placeholder="Brief description..."
                    rows={3}
                    maxLength={FIELD_LIMITS.description}
                    {...field}
                  />
                </FormControl>
                <CharCount length={field.value?.length ?? 0} max={FIELD_LIMITS.description} />
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Receipt</label>
            {!receiptFile && !receiptPreview ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-colors">
                <Upload className="h-7 w-7 text-muted-foreground/50 mb-1.5" />
                <span className="text-sm font-medium text-foreground/70">
                  Upload receipt
                </span>
                <span className="text-2xs text-muted-foreground mt-0.5 text-center px-1">
                  {RECEIPT_UPLOAD_FORMAT_HINT}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept={RECEIPT_ALLOWED_EXTENSIONS.join(",")}
                  onChange={handleFileChange}
                  aria-label="Upload receipt"
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                {receiptPreview ? (
                  <Image
                    src={receiptPreview}
                    alt="Receipt preview"
                    width={56}
                    height={56}
                    unoptimized
                    className="h-14 w-14 object-cover rounded"
                  />
                ) : (
                  <div className="h-14 w-14 flex items-center justify-center bg-gold/10 rounded">
                    <Receipt className="h-5 w-5 text-gold" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {receiptFile?.name ?? "Existing receipt"}
                  </p>
                  {receiptFile && (
                    <p className="text-2xs text-muted-foreground">
                      {(receiptFile.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  className="shrink-0 h-7 w-7"
                  aria-label="Remove receipt"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Form>
    </HrSheet>
  );
}
