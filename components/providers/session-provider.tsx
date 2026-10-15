"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  // When the server already resolved the session (the dashboard layout does),
  // hand it over so useSession() renders from it instead of blocking the
  // sidebar and every role-gated page on a /api/auth/session round trip (A44).
  session?: Session | null;
}) {
  return (
    <NextAuthSessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </NextAuthSessionProvider>
  );
}
