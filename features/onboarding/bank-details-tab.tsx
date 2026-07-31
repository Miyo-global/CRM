"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { bankDetailsSchema } from "@/lib/validations/bank-details";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBankDetails } from "@/server/actions/onboarding-actions";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useOnboardingSubmit } from "@/lib/hooks/use-onboarding-submit";
import { FormNavButtons } from "@/components/onboarding/form-nav-buttons";

const bankSchema = bankDetailsSchema
  .pick({
    accountHolder: true,
    bankName: true,
    branch: true,
    accountNumber: true,
    ifsc: true,
  })
  .extend({
    taxId: z
      .string()
      .trim()
      .max(20, "Tax ID must be at most 20 characters")
      .optional()
      .or(z.literal("")),
  });

type BankFormValues = z.infer<typeof bankSchema>;

interface BankDetailsTabProps {
  onComplete: (values: Record<string, string | undefined>) => void;
  onBack: () => void;
  defaultValues?: Record<string, string | undefined>;
}

export function BankDetailsTab({ onComplete, onBack, defaultValues }: BankDetailsTabProps) {
  const { isLoading, handleSubmit } = useOnboardingSubmit(updateBankDetails, {
    successMessage: "Bank details saved!",
    onSuccess: onComplete,
  });
  const form = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: { accountHolder: "", bankName: "", branch: "", accountNumber: "", ifsc: "", taxId: "", ...defaultValues },
  });

  const { errors } = form.formState;

  return (
    <div>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Bank & Tax Details</h2>
          <p className="text-sm text-muted-foreground mt-1">Required for payroll processing.</p>
        </motion.div>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountHolder">Account Holder Name</Label>
                <Input
                  id="accountHolder"
                  {...form.register("accountHolder")}
                  placeholder="Your Name"
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={!!errors.accountHolder}
                  aria-describedby={errors.accountHolder ? "accountHolder-error" : undefined}
                  className="text-base sm:text-sm focus-visible:ring-primary"
                />
                {errors.accountHolder && <p id="accountHolder-error" role="alert" className="text-sm text-destructive">{errors.accountHolder.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  {...form.register("bankName")}
                  placeholder="HDFC, SBI, etc."
                  aria-required="true"
                  aria-invalid={!!errors.bankName}
                  aria-describedby={errors.bankName ? "bankName-error" : undefined}
                  className="text-base sm:text-sm focus-visible:ring-primary"
                />
                {errors.bankName && <p id="bankName-error" role="alert" className="text-sm text-destructive">{errors.bankName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  {...form.register("branch")}
                  placeholder="Branch name"
                  aria-required="true"
                  aria-invalid={!!errors.branch}
                  aria-describedby={errors.branch ? "branch-error" : undefined}
                  className="text-base sm:text-sm focus-visible:ring-primary"
                />
                {errors.branch && <p id="branch-error" role="alert" className="text-sm text-destructive">{errors.branch.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  type="text"
                  {...form.register("accountNumber")}
                  placeholder="00000000000"
                  maxLength={20}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={!!errors.accountNumber}
                  aria-describedby={errors.accountNumber ? "accountNumber-error" : undefined}
                  className="text-base sm:text-sm focus-visible:ring-primary"
                />
                {errors.accountNumber && <p id="accountNumber-error" role="alert" className="text-sm text-destructive">{errors.accountNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc">IFSC Code</Label>
                <Input
                  id="ifsc"
                  {...form.register("ifsc", {
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      form.setValue("ifsc", e.target.value.toUpperCase(), { shouldDirty: true });
                    },
                  })}
                  placeholder="HDFC0001234"
                  aria-required="true"
                  aria-invalid={!!errors.ifsc}
                  aria-describedby={errors.ifsc ? "ifsc-error" : undefined}
                  className="text-base sm:text-sm focus-visible:ring-primary uppercase"
                />
                {errors.ifsc && <p id="ifsc-error" role="alert" className="text-sm text-destructive">{errors.ifsc.message}</p>}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="space-y-2">
              <Label htmlFor="taxId">Tax ID (PAN/SSN) <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
              <Input id="taxId" {...form.register("taxId")} placeholder="ABCDE1234F" aria-describedby="taxId-hint" className="text-base sm:text-sm focus-visible:ring-primary" />
              <p id="taxId-hint" className="sr-only">Optional tax identification number</p>
            </motion.div>
            <motion.div variants={fadeUp}>
              <FormNavButtons onBack={onBack} isLoading={isLoading} />
            </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
