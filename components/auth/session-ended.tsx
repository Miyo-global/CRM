"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

/**
 * Rendered by the dashboard layout when the session was revoked, the account
 * deactivated, or portal access switched off: the cookie is cleared and the
 * user lands on /signin (R2-LC-17).
 */
export function SessionEnded() {
  useEffect(() => {
    void signOut({ callbackUrl: "/signin" });
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <p role="status" className="text-sm text-muted-foreground">
        Your session has ended. Signing you out…
      </p>
    </div>
  );
}
