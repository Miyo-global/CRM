import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "../db";
import { accounts, sessions, users, verificationTokens, organizationMembers, organizations, userSessions } from "../db/schema";
import bcrypt from "bcryptjs";
import { eq, and, ne, sql } from "drizzle-orm";
import { Adapter } from "next-auth/adapters";
import { logger } from "../logger";
import { redis } from "../redis";
import { randomUUID } from "crypto";
import { getDeviceId } from "../device-fingerprint";
import { sendAccountLockedEmail, sendNewDeviceLoginEmail } from "../email";
import { createAuditLog } from "../audit-log";

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
  totpEnabled: boolean | null;
  mfaEnforced: boolean | null;
}

const USER_SESSION_TTL = 300;

function userSessionKey(userId: string): string {
  return `user:session:${userId}`;
}

export function mfaLoginVerifiedKey(sessionId: string): string {
  return `mfa:verified:${sessionId}`;
}

export const MFA_LOGIN_VERIFIED_TTL = 300;

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
          emailVerified: true,
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
        return null;
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingSeconds = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 1000);
        logger.warn("Auth: login attempt on locked account", { userId: user.id, email: normalizedEmail, lockedUntil: user.lockedUntil });
        throw new Error(`ACCOUNT_LOCKED:${remainingSeconds}`);
      }

      const isValid = await bcrypt.compare(
        credentials.password as string,
        user.password
      );

      if (!isValid) {
        const attempts = (user.loginAttempts ?? 0) + 1;
        const lockUpdate: Record<string, unknown> = { loginAttempts: attempts };
        if (attempts >= 5) {
          lockUpdate.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
          logger.warn("Auth: account locked after 5 failed attempts", { userId: user.id, email: normalizedEmail });
          sendAccountLockedEmail(user.email, user.name ?? user.email).catch((e) => logger.error("Auth: account-locked email failed", { userId: user.id, error: e }));
        } else {
          logger.warn("Auth: failed login attempt", { userId: user.id, email: normalizedEmail, attempt: attempts });
        }
        await db.update(users).set(lockUpdate).where(eq(users.id, user.id));
        return null;
      }

      if (!user.emailVerified) {
        logger.warn("Auth: login with valid credentials on unverified email", { userId: user.id, email: normalizedEmail });
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      logger.info("Auth: successful login", { userId: user.id, email: normalizedEmail });

      if (user.loginAttempts && user.loginAttempts > 0) {
        await db.update(users).set({ loginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
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
              role: user.role || "ENGINEERING",
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
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
        token.mfaSatisfied = false;

        const userAgent = "";
        const ipAddress = "";
        const deviceId = getDeviceId(userAgent, ipAddress);

        db.insert(userSessions).values({
          id: token.sessionId,
          userId: user.id as string,
          deviceId,
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
            sendNewDeviceLoginEmail(user.email, user.name ?? user.email, {
              userAgent,
              ipAddress,
              time: new Date().toISOString(),
            }).catch(() => {});
          }
        }
      }

      if (token.id) {
        try {
          const userId = token.id as string;
          let dbUser: UserSessionCache | null = null;

          if (redis) {
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
                totpEnabled: true,
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
                totpEnabled: true,
              },
            }));

            const [fresh, membership] = await Promise.all([
              fetchFresh(),
              db.query.organizationMembers.findFirst({
                where: eq(organizationMembers.userId, userId),
                columns: { orgId: true },
              }),
            ]);

            let mfaEnforcedValue = false;
            if (membership?.orgId) {
              const orgRow = await db.query.organizations.findFirst({
                where: eq(organizations.id, membership.orgId),
                columns: { mfaEnforced: true },
              });
              mfaEnforcedValue = orgRow?.mfaEnforced ?? false;
            }

            const cacheValue: UserSessionCache | null = fresh
              ? {
                  ...fresh,
                  onboardingCompleted: (fresh as Record<string, unknown>).onboardingCompleted as boolean ?? true,
                  orgId: membership?.orgId ?? null,
                  branchId: fresh.branchId ?? null,
                  totpEnabled: fresh.totpEnabled ?? false,
                  mfaEnforced: mfaEnforcedValue,
                }
              : null;
            if (cacheValue && redis) {
              await redis.set(userSessionKey(userId), cacheValue, { ex: USER_SESSION_TTL });
            }
            dbUser = cacheValue;
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
            token.totpEnabled = dbUser.totpEnabled ?? false;
            token.mfaEnforced = dbUser.mfaEnforced ?? false;
            token.mfaSatisfied = token.totpEnabled ? token.mfaSatisfied === true : true;
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

      if (
        trigger === "update" &&
        token.totpEnabled &&
        token.mfaSatisfied !== true &&
        token.sessionId &&
        redis
      ) {
        try {
          const marker = await redis.get<boolean>(mfaLoginVerifiedKey(token.sessionId as string));
          if (marker) {
            token.mfaSatisfied = true;
            await redis.del(mfaLoginVerifiedKey(token.sessionId as string));
          }
        } catch (e) {
          logger.error("Auth: mfa login-verify marker read failed", { error: e });
        }
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
      session.mfaSatisfied = (token.mfaSatisfied as boolean | undefined) ?? true;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
