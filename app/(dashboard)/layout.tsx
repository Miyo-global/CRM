import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { MANAGEMENT_ROLES, hasRole } from "@/lib/constants/roles";
import { getPendingApprovalCount } from "@/server/actions/leave-actions";
import { SessionProvider } from "@/components/providers/session-provider";
import { SessionEnded } from "@/components/auth/session-ended";
import { sessionRevocationState } from "@/lib/auth/live-session";
import { isPortalAccessBlocked } from "@/lib/auth/portal-access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const role = session.user.role;

  // R2-LC-17: auth() only verifies the JWT. Portal Access OFF, deactivation
  // and "log out everywhere" must end the session on the next page load.
  if (
    session.user.isActive === false ||
    isPortalAccessBlocked(role, session.user.hasDashboardAccess) ||
    (await sessionRevocationState(session)) === "revoked"
  ) {
    return <SessionEnded />;
  }

  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  // Prefetch the one number the sidebar needs, for the roles that can see it.
  const pendingLeaveApprovals = hasRole(role, MANAGEMENT_ROLES)
    ? await getPendingApprovalCount()
    : 0;

  return (
    // The session is already resolved here, so hand it to a nested provider:
    // the sidebar and every role-gated page then render on first paint rather
    // than after a client /api/auth/session fetch (A44).
    <SessionProvider session={session} redirectOnSignOut>
      <DashboardShell
        userId={session.user.id}
        defaultCollapsed={defaultCollapsed}
        pendingLeaveApprovals={pendingLeaveApprovals}
      >
        {children}
      </DashboardShell>
    </SessionProvider>
  );
}
