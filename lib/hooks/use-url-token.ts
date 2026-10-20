"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * QA-SEC-12: read ?token= once, then drop it from the address bar so the
 * reset/setup link does not sit in history or get copied along with the URL.
 * The value is kept in state because the search params update after
 * replaceState. The routes also send Referrer-Policy: no-referrer
 * (next.config), so it never leaves in a Referer header either.
 */
export function useUrlToken(): string | null {
  const urlToken = useSearchParams().get("token");
  const [token] = useState(urlToken);
  useEffect(() => {
    if (!urlToken) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [urlToken]);
  return token;
}
