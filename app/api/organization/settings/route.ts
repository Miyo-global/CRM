import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getOrgSettings } from "@/server/queries/organization";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { jobOfficeLocationPresetEntrySchema } from "@/lib/validations/text-rules";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  logo: z.string().url().nullable().optional(),
  timezone: z.string().min(1).optional(),
  currency: z.enum(["USD", "EUR", "INR", "GBP", "AED"]).optional(),
  fiscalYearStart: z.number().int().min(1).max(12).optional(),
  directoryPublic: z.boolean().optional(),
  mfaEnforced: z.boolean().optional(),
  allowedEmailDomains: z.array(z.string().min(1)).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  loginBgUrl: z.string().url().nullable().optional(),
  ipAllowlist: z.array(z.string().min(1)).optional(),
  jobOfficeLocations: z.array(jobOfficeLocationPresetEntrySchema).max(100).optional(),
  minMonthlySalary: z
    .number()
    .int("Minimum monthly salary must be a whole number")
    .min(0, "Minimum monthly salary cannot be negative")
    .max(100_000_000, "Minimum monthly salary is too large")
    .nullable()
    .optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getOrgSettings(session.orgId);
      if (!data) return err("Organization not found", 404);

      const settings = (data.settings as Record<string, unknown>) ?? {};
      const rawJobOffices = settings.jobOfficeLocations;
      const jobSeen = new Set<string>();
      const jobOfficeLocations: { name: string; city: string; state: string; country: string }[] = [];
      if (Array.isArray(rawJobOffices)) {
        for (const x of rawJobOffices as unknown[]) {
          if (typeof x === "object" && x !== null) {
            const loc = x as { name?: unknown; city?: unknown; state?: unknown; country?: unknown };
            const name = typeof loc.name === "string" ? loc.name.trim() : "";
            if (!name) continue;
            const key = name.toLowerCase();
            if (jobSeen.has(key)) continue;
            jobSeen.add(key);
            jobOfficeLocations.push({
              name,
              city: typeof loc.city === "string" ? loc.city.trim() : "",
              state: typeof loc.state === "string" ? loc.state.trim() : "",
              country: typeof loc.country === "string" ? loc.country.trim() : "",
            });
          }
        }
      }
      const rawMinSalary = settings.minMonthlySalary;
      const minMonthlySalary =
        typeof rawMinSalary === "number" && Number.isFinite(rawMinSalary) && rawMinSalary > 0
          ? Math.floor(rawMinSalary)
          : null;

      return ok({
        ...data,
        primaryColor: (settings.primaryColor as string | null) ?? null,
        loginBgUrl: (settings.loginBgUrl as string | null) ?? null,
        ipAllowlist: (settings.ipAllowlist as string[]) ?? [],
        directoryPublic: (settings.directoryPublic as boolean | undefined) ?? false,
        jobOfficeLocations,
        minMonthlySalary,
      });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load organization settings",
        500
      );
    }
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      if (!isAdminOrOwner(session.user.role)) {
        return err("Forbidden", 403);
      }

      const input = await parseBody(req, updateSchema);

      if (input.slug) {
        const existing = await db.query.organizations.findFirst({
          where: and(
            eq(organizations.slug, input.slug),
            eq(organizations.id, session.orgId)
          ),
        });
        if (!existing) {
          const slugTaken = await db.query.organizations.findFirst({
            where: eq(organizations.slug, input.slug),
          });
          if (slugTaken) return err("Slug already in use", 409);
        }
      }

      const updateData: {
        name?: string;
        slug?: string;
        logo?: string | null;
        timezone?: string;
        currency?: string;
        fiscalYearStart?: number;
        mfaEnforced?: boolean;
        allowedEmailDomains?: string[];
        settings?: Record<string, unknown>;
      } = {};

      if (input.name) updateData.name = input.name;
      if (input.slug) updateData.slug = input.slug;
      if (input.timezone !== undefined) updateData.timezone = input.timezone;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.fiscalYearStart !== undefined) updateData.fiscalYearStart = input.fiscalYearStart;
      if (input.logo !== undefined) updateData.logo = input.logo;
      if (input.mfaEnforced !== undefined) updateData.mfaEnforced = input.mfaEnforced;
      if (input.allowedEmailDomains !== undefined) updateData.allowedEmailDomains = input.allowedEmailDomains;

      const hasSettingsUpdate =
        input.directoryPublic !== undefined ||
        input.primaryColor !== undefined ||
        input.loginBgUrl !== undefined ||
        input.ipAllowlist !== undefined ||
        input.jobOfficeLocations !== undefined ||
        input.minMonthlySalary !== undefined;

      if (hasSettingsUpdate) {
        const currentOrg = await db.query.organizations.findFirst({
          where: eq(organizations.id, session.orgId),
        });
        const currentSettings: Record<string, unknown> =
          (currentOrg?.settings as Record<string, unknown>) ?? {};

        if (input.directoryPublic !== undefined) currentSettings.directoryPublic = input.directoryPublic;
        if (input.primaryColor !== undefined) {
          if (input.primaryColor === null) {
            delete currentSettings.primaryColor;
          } else {
            currentSettings.primaryColor = input.primaryColor;
          }
        }
        if (input.loginBgUrl !== undefined) {
          if (input.loginBgUrl === null) {
            delete currentSettings.loginBgUrl;
          } else {
            currentSettings.loginBgUrl = input.loginBgUrl;
          }
        }
        if (input.ipAllowlist !== undefined) {
          currentSettings.ipAllowlist = input.ipAllowlist;
        }
        if (input.jobOfficeLocations !== undefined) {
          const seen = new Set<string>();
          const deduped = [];
          for (const loc of input.jobOfficeLocations) {
            const key = loc.name.trim().toLowerCase();
            if (!key || seen.has(key)) continue;
            seen.add(key);
            deduped.push(loc);
          }
          currentSettings.jobOfficeLocations = deduped;
        }
        if (input.minMonthlySalary !== undefined) {
          if (input.minMonthlySalary === null || input.minMonthlySalary <= 0) {
            delete currentSettings.minMonthlySalary;
          } else {
            currentSettings.minMonthlySalary = Math.floor(input.minMonthlySalary);
          }
        }
        updateData.settings = currentSettings;
      }

      if (Object.keys(updateData).length > 0) {
        await db
          .update(organizations)
          .set(updateData)
          .where(eq(organizations.id, session.orgId));
      }

      if (input.ipAllowlist !== undefined && redis) {
        try {
          if (input.ipAllowlist.length === 0) {
            await redis.del(`org:ip-allowlist:${session.orgId}`);
          } else {
            await redis.set(
              `org:ip-allowlist:${session.orgId}`,
              JSON.stringify(input.ipAllowlist),
              { ex: 3600 }
            );
          }
        } catch {
        }
      }

      const changedFields = Object.keys(input).filter(
        (k) => input[k as keyof typeof input] !== undefined
      );

      await createAuditLog({
        action: "settings.updated",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: session.orgId,
        targetType: "organization",
        metadata: { changedFields },
      });

      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update organization settings",
        500
      );
    }
  });
}
