"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function PayrollScheduleError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Payroll Schedule Error" fallbackMessage="Failed to load the payroll schedule. Please try again." />;
}
