"use client";

import { useEffect, useRef } from "react";
import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";

// next-auth already tells every tab over its BroadcastChannel when one tab
// signs out, and the session flips to "unauthenticated" there, but nothing
// acted on it, so other tabs kept a stale dashboard (QA-LOGIN-01).
function RedirectOnSignOut() {
  const { status } = useSession();
  const prev = useRef(status);
  useEffect(() => {
    if (prev.current === "authenticated" && status === "unauthenticated") {
      const back = window.location.pathname + window.location.search;
      window.location.replace(`/signin?callbackUrl=${encodeURIComponent(back)}`);
    }
    prev.current = status;
  }, [status]);
  return null;
}

export function SessionProvider({
  children,
  session,
  redirectOnSignOut = false,
}: {
  children: React.ReactNode;
  // When the server already resolved the session (the dashboard layout does),
  // hand it over so useSession() renders from it instead of blocking the
  // sidebar and every role-gated page on a /api/auth/session round trip (A44).
  session?: Session | null;
  /** Send this tab to /signin when the session ends in any tab. */
  redirectOnSignOut?: boolean;
}) {
  return (
    <NextAuthSessionProvider session={session} refetchOnWindowFocus={false}>
      {redirectOnSignOut && <RedirectOnSignOut />}
      {children}
    </NextAuthSessionProvider>
  );
}
