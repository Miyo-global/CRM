
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    orgId?: string | null;
    sessionId?: string;
    mfaSatisfied?: boolean;
    user: {
      id: string;
      role: string;
      forceChangePassword?: boolean;
      isActive?: boolean;
      hasDashboardAccess?: boolean;
      onboardingCompleted?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    forceChangePassword?: boolean;
    id?: string;
    isActive?: boolean;
    hasDashboardAccess?: boolean;
    onboardingCompleted?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    orgId?: string | null;
    role?: string;
    forceChangePassword?: boolean;
    isActive?: boolean;
    hasDashboardAccess?: boolean;
    onboardingCompleted?: boolean;
    image?: string | null;
    branchId?: number | null;
    sessionId?: string;
    totpEnabled?: boolean;
    mfaEnforced?: boolean;
    mfaSatisfied?: boolean;
  }
}
