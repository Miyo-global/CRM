import NextAuth, { CredentialsSignin } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "../db";
import { accounts, sessions, users, verificationTokens, organizationMembers, userSessions } from "../db/schema";
import bcrypt from "bcryptjs";
import { eq, and, ne, sql } from "drizzle-orm";
import { Adapter } from "next-auth/adapters";
import { logger } from "../logger";
import { redis } from "../redis";
import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { getDeviceId } from "../device-fingerprint";
import { sendAccountLockedEmail, sendNewDeviceLoginEmail } from "../email";
import { clearFailedAttempts, recordFailedAttempt } from "./failed-attempts";
import { getTodayString } from "@/lib/date-utils";
import { createAuditLog } from "../audit-log";
import { isPortalAccessBlocked } from "./portal-access";
import { afterResponse } from "../after-response";

interface UserSessionCache {
  isActive: boolean | null;
  hasDashboardAccess: boolean | null;
  isPasswordChangeRequired: boolean | null;
  onboardingCompleted: boolean | null;
  image: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  role: string | null;
  orgId: string | null;
  branchId: number | null;
}

const USER_SESSION_TTL = 300;

/**
 * A plain Error thrown from authorize() reaches the client as
 * error=Configuration; a CredentialsSignin subclass carries its code through
 * to signIn()'s result (V5-0009).
 */
class BeforeJoiningDateError extends CredentialsSignin {
  code = "before_joining_date";
}

function userSessionKey(userId: string): string {
  return `user:session:${userId}`;
}

export async function invalidateUserSession(userId: string): Promise<void> {
  if (!redis) {
    logger.error(
      "invalidateUserSession: Redis unavailable — session NOT revoked after password change. " +
      "Existing sessions for this user remain valid.",
      { userId }
    );
    return;
  }
  await redis.del(userSessionKey(userId));
}

const SESSION_REVOKE_TTL = 8 * 60 * 60;

export async function revokeAllUserSessions(
  userId: string,
  opts?: { exceptSessionId?: string }
): Promise<void> {
  const exceptId = opts?.exceptSessionId;

  const activeFilter = and(
    eq(userSessions.userId, userId),
    eq(userSessions.isRevoked, false),
    exceptId ? ne(userSessions.id, exceptId) : undefined
  );

  const revoked = await db
    .update(userSessions)
    .set({ isRevoked: true })
    .where(activeFilter)
    .returning({ id: userSessions.id });

  if (redis && revoked.length > 0) {
    await Promise.all(
      revoked.map((s) =>
        redis!
          .set(`revoked:session:${s.id}`, true, { ex: SESSION_REVOKE_TTL })
          .catch((e) =>
            logger.error("revokeAllUserSessions: redis revoke key failed", { sessionId: s.id, error: e })
          )
      )
    );
  }

  await invalidateUserSession(userId);
}

/**
 * R3-SA-15: a deactivated / portal-off account still sees the generic
 * sign-in failure, but support can tell it apart in the audit log.
 */
async function auditLoginBlocked(userId: string, reason: "deactivated" | "portal_off", provider: string): Promise<void> {
  const membership = await db.query.organizationMembers
    .findFirst({ where: eq(organizationMembers.userId, userId), columns: { orgId: true } })
    .catch(() => undefined);
  await createAuditLog({
    action: "user.login_blocked",
    userId,
    orgId: membership?.orgId,
    targetId: userId,
    targetType: "user",
    metadata: { reason: reason === "deactivated" ? "terminated/deactivated" : "portal off", provider },
  });
}

const credentialsProvider = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const normalizedEmail = (credentials.email as string).toLowerCase().trim();

      const user = await db.query.users.findFirst({
        where: sql`lower(${users.email}) = ${normalizedEmail}`,
        columns: {
          id: true, email: true, password: true, name: true,
          firstName: true, lastName: true, image: true, role: true,
          isActive: true, hasDashboardAccess: true, onboardingCompleted: true,
          isPasswordChangeRequired: true, loginAttempts: true, lockedUntil: true,
          emailVerified: true, joiningDate: true,
        },
      }).catch(async () => {
        return db.query.users.findFirst({
          where: sql`lower(${users.email}) = ${normalizedEmail}`,
          columns: {
            id: true, email: true, password: true, name: true,
            firstName: true, lastName: true, image: true, role: true,
            isActive: true, hasDashboardAccess: true,
            isPasswordChangeRequired: true, loginAttempts: true, lockedUntil: true,
            emailVerified: true,
          },
        });
      });

      if (!user || !user.password) {
        logger.warn("Auth: login attempt for non-existent account", { email: normalizedEmail });
        return null;
      }

      if (user.isActive === false) {
        logger.warn("Auth: login attempt on deactivated account", { userId: user.id, email: normalizedEmail });
        await auditLoginBlocked(user.id, "deactivated", "credentials");
        return null;
      }

      // No access before the first day: an account set up in advance should
      // not carry a full session while the hire has not started (QA-0070).
      const joiningDate = "joiningDate" in user ? user.joiningDate : null;
      if (joiningDate && String(joiningDate).slice(0, 10) > getTodayString()) {
        logger.warn("Auth: login attempt before joining date", {
          userId: user.id,
          email: normalizedEmail,
          joiningDate,
        });
        throw new BeforeJoiningDateError();
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        // Generic failure: a distinguishable ACCOUNT_LOCKED error let anyone
        // confirm an address exists, and 5 bad guesses then locked it
        // (QA-0037). The owner is emailed when a lock starts.
        logger.warn("Auth: login attempt on locked account", { userId: user.id, email: normalizedEmail, lockedUntil: user.lockedUntil });
        return null;
      }

      const isValid = await bcrypt.compare(
        credentials.password as string,
        user.password
      );

      if (!isValid) {
        // Escalating cooldown, (QA-0037).
        const { attempts, lockedUntil } = await recordFailedAttempt(user.id, user.loginAttempts);
        if (lockedUntil) {
          logger.warn("Auth: account locked after failed attempts", { userId: user.id, email: normalizedEmail, attempts, lockedUntil });
          afterResponse("Auth: account-locked email", () => sendAccountLockedEmail(user.email, attempts, lockedUntil));
        } else {
          logger.warn("Auth: failed login attempt", { userId: user.id, email: normalizedEmail, attempt: attempts });
        }
        return null;
      }

      if (!user.emailVerified) {
        // Also generic: an unverified account must not be distinguishable from
        // a wrong password (QA-0037). The set-up email is the way in.
        logger.warn("Auth: login with valid credentials on unverified email", { userId: user.id, email: normalizedEmail });
        return null;
      }

      // Portal Access OFF: no session at all, with the same generic failure
      // as a wrong password, rather than a session that a client page then
      // blocks (R2-LC-18).
      if (isPortalAccessBlocked(user.role, user.hasDashboardAccess)) {
        logger.warn("Auth: login with valid credentials on portal-disabled account", { userId: user.id, email: normalizedEmail });
        await auditLoginBlocked(user.id, "portal_off", "credentials");
        return null;
      }

      logger.info("Auth: successful login", { userId: user.id, email: normalizedEmail });

      if (user.loginAttempts && user.loginAttempts > 0) {
        await clearFailedAttempts(user.id);
      }

      const existingMembership = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, user.id),
      });
      if (!existingMembership) {
        const org = await db.query.organizations.findFirst();
        if (org) {
          await db
            .insert(organizationMembers)
            .values({
              userId: user.id,
              orgId: org.id,
              role: user.role || "EMPLOYEE",
            })
            .onConflictDoNothing();
        }
      }

      const fullName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.name || user.email;

      const role = user.role;
      const forceChangePassword = user.isPasswordChangeRequired || false;

      return {
        id: user.id,
        email: user.email,
        name: fullName,
        image: user.image,
        role: role,

        forceChangePassword: forceChangePassword,
        isActive: user.isActive,
        hasDashboardAccess: user.hasDashboardAccess ?? true,
        onboardingCompleted: (user as Record<string, unknown>).onboardingCompleted as boolean ?? true,
      };
    },
  });

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    : null;

type AdapterAccountsTable = NonNullable<Parameters<typeof DrizzleAdapter<typeof db>>[1]>["accountsTable"];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    // Token columns are encrypted custom types (SEC-0006): same runtime shape,
    // but the adapter types only accept plain text columns.
    accountsTable: accounts as unknown as AdapterAccountsTable,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter,
  trustHost: true,
  basePath: "/api/auth",
  providers: googleProvider
    ? [credentialsProvider, googleProvider]
    : [credentialsProvider],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await db.query.users.findFirst({
          where: sql`lower(${users.email}) = ${(user.email ?? "").toLowerCase()}`,
        });
        if (!existingUser) {
          return false;
        }
        if (existingUser.isActive === false) {
          logger.warn("Auth: google sign-in on deactivated account", { userId: existingUser.id, email: existingUser.email });
          await auditLoginBlocked(existingUser.id, "deactivated", "google");
          return false;
        }
        if (!existingUser.emailVerified) {
          logger.warn("Auth: google sign-in on unverified email", { userId: existingUser.id, email: existingUser.email });
          return false;
        }
        if (existingUser.lockedUntil && new Date(existingUser.lockedUntil) > new Date()) {
          logger.warn("Auth: google sign-in on locked account", { userId: existingUser.id, email: existingUser.email });
          return false;
        }
        if (isPortalAccessBlocked(existingUser.role, existingUser.hasDashboardAccess)) {
          logger.warn("Auth: google sign-in on portal-disabled account", { userId: existingUser.id, email: existingUser.email });
          await auditLoginBlocked(existingUser.id, "portal_off", "google");
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.image = user.image;
        token.forceChangePassword = user.forceChangePassword;
        token.isActive = user.isActive;
        token.hasDashboardAccess = user.hasDashboardAccess ?? true;
        token.onboardingCompleted = (user as Record<string, unknown>).onboardingCompleted as boolean ?? true;
        token.orgId = null;
        token.sessionId = randomUUID();

        const userAgent = "";
        const ipAddress = "";
        // ponytail: deviceId stays the old constant fingerprint so this change
        // does not mail every user a "new device" alert; fingerprint on the
        // real UA once that email is wanted.
        const deviceId = getDeviceId(userAgent, ipAddress);
        // Record the real browser and IP so Active sessions does not list
        // every sign-in as "Unknown device" (QA P3 session-accumulation).
        const reqHeaders = await Promise.resolve().then(() => headers()).catch(() => null);

        db.insert(userSessions).values({
          id: token.sessionId,
          userId: user.id as string,
          deviceId,
          userAgent: reqHeaders?.get("user-agent") ?? null,
          ipAddress: reqHeaders?.get("x-forwarded-for")?.split(",")[0].trim() ?? reqHeaders?.get("x-real-ip") ?? null,
        }).catch((e) => logger.error("Auth: userSessions insert failed", { userId: user.id, error: e }));

        createAuditLog({
          action: "user.login",
          userId: user.id as string,
          orgId: (token.orgId as string | null) ?? "unknown",
          targetId: user.id as string,
          targetType: "user",
          metadata: { email: user.email },
        }).catch((e) => logger.error("Auth: login audit log failed", { userId: user.id, error: e }));

        if (redis) {
          const existingSessions = await db.query.userSessions.findMany({
            where: eq(userSessions.userId, user.id as string),
            columns: { deviceId: true },
          }).catch(() => []);

          const knownDeviceIds = existingSessions
            .map((s) => s.deviceId)
            .filter((d): d is string => d !== null && d !== undefined);

          const isNewDevice = !knownDeviceIds.includes(deviceId);
          if (isNewDevice && knownDeviceIds.length > 0 && user.email) {
            sendNewDeviceLoginEmail(user.email, { userAgent, ipAddress }).catch(() => {});
          }
        }
      }

      if (token.id) {
        try {
          const userId = token.id as string;
          let dbUser: UserSessionCache | null = null;

          // Never trust the cache at sign-in: a role changed within the TTL
          // would otherwise come back as the old role (QA P0 role-session).
          if (redis && !user) {
            dbUser = await redis.get<UserSessionCache>(userSessionKey(userId));
          }

          if (!dbUser) {
            const fetchFresh = () => db.query.users.findFirst({
              where: eq(users.id, userId),
              columns: {
                isActive: true,
                hasDashboardAccess: true,
                isPasswordChangeRequired: true,
                onboardingCompleted: true,
                image: true,
                firstName: true,
                lastName: true,
                name: true,
                role: true,
                branchId: true,
              },
            }).catch(() => db.query.users.findFirst({
              where: eq(users.id, userId),
              columns: {
                isActive: true,
                hasDashboardAccess: true,
                isPasswordChangeRequired: true,
                image: true,
                firstName: true,
                lastName: true,
                name: true,
                role: true,
                branchId: true,
              },
            }));

            const [fresh, membership] = await Promise.all([
              fetchFresh(),
              db.query.organizationMembers.findFirst({
                where: eq(organizationMembers.userId, userId),
                columns: { orgId: true },
              }),
            ]);

            const cacheValue: UserSessionCache | null = fresh
              ? {
                  ...fresh,
                  onboardingCompleted: (fresh as Record<string, unknown>).onboardingCompleted as boolean ?? true,
                  orgId: membership?.orgId ?? null,
                  branchId: fresh.branchId ?? null,
                }
              : null;
            if (cacheValue && redis) {
              await redis.set(userSessionKey(userId), cacheValue, { ex: USER_SESSION_TTL });
            }
            dbUser = cacheValue;
            // Cache misses come at most every USER_SESSION_TTL, so this keeps
            // lastActive fresh enough for the Active sessions list.
            if (token.sessionId && !user) {
              db.update(userSessions)
                .set({ lastActive: new Date() })
                .where(eq(userSessions.id, token.sessionId as string))
                .catch((e) => logger.error("Auth: userSessions lastActive update failed", { userId, error: e }));
            }
          }

          if (dbUser) {
            token.isActive = dbUser.isActive ?? undefined;
            token.hasDashboardAccess = dbUser.hasDashboardAccess ?? true;
            token.onboardingCompleted = dbUser.onboardingCompleted ?? true;
            token.forceChangePassword = dbUser.isPasswordChangeRequired || false;
            token.role = dbUser.role || token.role;
            token.image = dbUser.image || null;
            token.orgId = dbUser.orgId ?? null;
            token.branchId = dbUser.branchId ?? null;
            if (dbUser.firstName && dbUser.lastName) {
              token.name = `${dbUser.firstName} ${dbUser.lastName}`;
            } else if (dbUser.name) {
              token.name = dbUser.name;
            }
          }

          if (redis && token.sessionId) {
            await redis.set(
              `session:activity:${token.sessionId as string}`,
              Date.now(),
              { ex: 7200 }
            ).catch(() => {});
          }
        } catch (error) {
          logger.error("Auth: jwt callback session refresh failed", { userId: token.id, error });
        }
      }

      if (trigger === "update" && session?.forceChangePassword !== undefined) {
        token.forceChangePassword = session.forceChangePassword;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.image = (token.image as string) || null;
        session.user.forceChangePassword = token.forceChangePassword as boolean;
        session.user.isActive = token.isActive as boolean;
        session.user.hasDashboardAccess = token.hasDashboardAccess as boolean;
      }
      session.orgId = token.orgId ?? null;
      session.sessionId = token.sessionId;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
