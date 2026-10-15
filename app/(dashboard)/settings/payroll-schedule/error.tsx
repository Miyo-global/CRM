"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function PayrollScheduleError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Couldn't load payroll schedule" fallbackMessage="Something went wrong loading the payroll schedule. Try again." />;
}
