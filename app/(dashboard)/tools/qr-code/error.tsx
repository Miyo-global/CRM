"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function QRCodeError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Failed to load QR Code"
      fallbackMessage="An unexpected error occurred while loading the QR code page."
    />
  );
}
