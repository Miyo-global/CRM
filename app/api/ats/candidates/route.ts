import type { NextRequest } from "next/server";
import { ZodError, z } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsActivity, candidates } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { findDuplicates } from "@/lib/ats/duplicates";
import { normalisePhone } from "@/lib/ats/phone";

const bodySchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name.").max(80),
  lastName: z.string().trim().max(80).default("—"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  phone: z.string().trim().max(20).optional(),
  linkedinUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
  currentCompany: z.string().trim().max(120).optional(),
  source: z.string().trim().max(60).default("MANUAL"),
  notes: z.string().trim().max(2000).optional(),
});

/** MIYO-0649: add somebody a recruiter met outside the careers site. */
export async function POST(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    try {
      const body = await parseBody(req, bodySchema);

      const matches = await findDuplicates(session.orgId, {
        email: body.email,
        phone: body.phone,
        linkedinUrl: body.linkedinUrl || null,
      });
      const emailMatch = matches.find((m) => m.matchedOn === "email");
      if (emailMatch) {
        return err(`${emailMatch.firstName} ${emailMatch.lastName} is already on file.`, 409);
      }

      const [created] = await db
        .insert(candidates)
        .values({
          orgId: session.orgId,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone ?? null,
          phoneNormalized: normalisePhone(body.phone),
          linkedinUrl: body.linkedinUrl || null,
          currentCompany: body.currentCompany ?? null,
          source: body.source,
          notes: body.notes ?? null,
          duplicateOfId: matches[0]?.id ?? null,
        })
        .returning();

      await db.insert(atsActivity).values({
        orgId: session.orgId,
        candidateId: created.id,
        actorId: session.user.id,
        type: "candidate_added",
        data: { source: body.source },
      });

      return ok(created, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid candidate.", 400);
      throw e;
    }
  }, req);
}
