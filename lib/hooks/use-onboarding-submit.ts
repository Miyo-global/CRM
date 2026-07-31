"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

type ActionResult = { success: true } | { success?: false; error?: string };

interface OnboardingSubmitOptions {
  successMessage: string;
  onSuccess: (values: Record<string, string | undefined>) => void;
  errorMessage?: string;
}

export function useOnboardingSubmit(
  action: (formData: FormData) => Promise<ActionResult>,
  options: OnboardingSubmitOptions,
) {
  const [isLoading, setIsLoading] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handleSubmit = useCallback(
    async (values: Record<string, string | undefined>) => {
      setIsLoading(true);
      try {
        const formData = new FormData();
        Object.entries(values).forEach(([k, v]) => {
          if (v !== undefined) formData.append(k, v);
        });
        const res = await action(formData);
        if (res.success) {
          toast.success(optionsRef.current.successMessage);
          optionsRef.current.onSuccess(values);
        } else {
          toast.error(
            ("error" in res && res.error) || optionsRef.current.errorMessage || "Something went wrong",
          );
        }
      } catch {
        toast.error(optionsRef.current.errorMessage || "An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [action],
  );

  return { isLoading, handleSubmit };
}
