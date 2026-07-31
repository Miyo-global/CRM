"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/storage/file-upload";
import {
  reimbursementRequestSchema,
  type ReimbursementRequestFormValues,
} from "@/lib/validations/common-forms";
import {
  RECEIPT_ALLOWED_EXTENSIONS,
  RECEIPT_MAX_FILE_SIZE_BYTES,
} from "@/lib/files/expense-file-validation";
import { toast } from "sonner";

const CATEGORIES = ["Travel", "Meals", "Office Supplies", "Software", "Medical", "Other"];

interface ReimbursementRequestFormProps {
  onSubmit: (values: ReimbursementRequestFormValues) => void;
  formId?: string;
}

export function ReimbursementRequestForm({
  onSubmit,
  formId = "reimbursement-request",
}: ReimbursementRequestFormProps) {
  const [category, setCategory] = useState("Travel");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  const handleReceiptUpload = useCallback((url: string) => {
    setReceiptUrl(url);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const parsed = reimbursementRequestSchema.safeParse({
        category,
        amount,
        description,
        receiptUrl,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Please fix form errors");
        return;
      }
      onSubmit(parsed.data);
    },
    [category, amount, description, receiptUrl, onSubmit],
  );

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Amount</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          placeholder="Details about the expense..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Receipt (optional)</Label>
        <FileUpload
          folder="receipts"
          accept={RECEIPT_ALLOWED_EXTENSIONS.join(",")}
          maxSize={RECEIPT_MAX_FILE_SIZE_BYTES}
          onUploadComplete={handleReceiptUpload}
        />
      </div>
    </form>
  );
}
