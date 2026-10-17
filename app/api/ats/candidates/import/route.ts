import type { NextRequest } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ZodError, z } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsActivity, candidates } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { mapCsvCandidates, parseCsv } from "@/lib/ats/csv";
import { normalisePhone } from "@/lib/ats/phone";

const bodySchema = z.object({
  csv: z.string().min(1, "Paste or upload a file first.").max(2_000_000),
  /** A dry run reports what would happen and writes nothing. */
  dryRun: z.boolean().default(true),
});

/** MIYO-0649: import a list, with a dry run and a duplicate check first. */
export async function POST(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    try {
      const body = await parseBody(req, bodySchema);
      const { candidates: rows, skipped } = mapCsvCandidates(parseCsv(body.csv));
      if (rows.length === 0) {
        return ok({ dryRun: body.dryRun, toCreate: 0, duplicates: 0, skipped, created: 0 });
      }

      const emails = rows.map((r) => r.email);
      const existing = await db
        .select({ email: candidates.email })
        .from(candidates)
        .where(
          and(
            eq(candidates.orgId, session.orgId),
            inArray(sql`lower(${candidates.email})`, emails),
          ),
        );
      const known = new Set(existing.map((e) => e.email.toLowerCase()));

      // The file itself may list the same person twice.
      const seen = new Set<string>();
      const fresh = rows.filter((row) => {
        if (known.has(row.email) || seen.has(row.email)) return false;
        seen.add(row.email);
        return true;
      });

      if (body.dryRun) {
        return ok({
          dryRun: true,
          toCreate: fresh.length,
          duplicates: rows.length - fresh.length,
          skipped,
          created: 0,
          sample: fresh.slice(0, 5),
        });
      }

      const created =
        fresh.length === 0
          ? []
          : await db
              .insert(candidates)
              .values(
                fresh.map((row) => ({
                  orgId: session.orgId,
                  firstName: row.firstName,
                  lastName: row.lastName,
                  email: row.email,
                  phone: row.phone ?? null,
                  phoneNormalized: normalisePhone(row.phone),
                  linkedinUrl: row.linkedinUrl ?? null,
                  source: row.source ?? "IMPORT",
                })),
              )
              .returning({ id: candidates.id });

      if (created.length > 0) {
        await db.insert(atsActivity).values(
          created.map((row) => ({
            orgId: session.orgId,
            candidateId: row.id,
            actorId: session.user.id,
            type: "candidate_imported",
          })),
        );
      }

      return ok({
        dryRun: false,
        toCreate: fresh.length,
        duplicates: rows.length - fresh.length,
        skipped,
        created: created.length,
      });
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid import.", 400);
      throw e;
    }
  }, req);
}
