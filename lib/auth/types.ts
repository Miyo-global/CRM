import type { Session } from "next-auth";

export type AuthResult =
  | { error: "Unauthorized" }
  | {
      session: Session;
      member: {
        id: number;
        orgId: string;
        userId: string;
        role: string;
        joinedAt: Date | null;
      };
      isAdmin: boolean;
      userId: string;
      orgId: string;
    };

export function isAuthError(result: AuthResult): result is { error: "Unauthorized" } {
  return "error" in result;
}
