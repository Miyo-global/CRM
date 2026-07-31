import "server-only";

import { getAuthenticatedMember } from "@/lib/auth/helpers";
import type { AuthResult } from "@/lib/auth/types";

type AuthContext = Exclude<AuthResult, { error: string }>;

export async function requireAuth(
  allowedRoles?: readonly string[]
): Promise<AuthContext | { error: "Unauthorized" } | { error: "Forbidden" }> {
  const result = await getAuthenticatedMember();
  if ("error" in result) return result;

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(result.member.role)) {
      return { error: "Forbidden" };
    }
  }

  return result;
}
