import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documents, certifications } from "@/lib/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const daysAhead = Number(req.nextUrl.searchParams.get("days")) || 30;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const todayStr = now.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    const [expiringDocs, expiringCerts] = await Promise.all([
      db.query.documents.findMany({
        where: and(
          eq(documents.orgId, session.orgId),
          eq(documents.isActive, true),
          gte(documents.expiryDate, todayStr),
          lte(documents.expiryDate, futureStr)
        ),
      }),
      db.query.certifications.findMany({
        where: and(
          eq(certifications.orgId, session.orgId),
          gte(certifications.expiryDate, todayStr),
          lte(certifications.expiryDate, futureStr)
        ),
        with: { user: true },
      }),
    ]);

    return ok({
      expiringDocuments: expiringDocs,
      expiringCertifications: expiringCerts,
      totalExpiring: expiringDocs.length + expiringCerts.length,
    });
  });
}
