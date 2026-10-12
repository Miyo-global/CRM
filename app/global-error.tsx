"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { BRAND } from "@/lib/design/brand-hex";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: BRAND.ink, color: BRAND.canvas, fontFamily: "system-ui, sans-serif" }}>
        <div
          role="alert"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${BRAND.gold}` }}
          />
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ margin: 0, maxWidth: 420, color: BRAND.border, lineHeight: 1.5 }}>
            The page failed to load. Our team has been notified.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 8,
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              background: BRAND.gold,
              color: BRAND.ink,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
