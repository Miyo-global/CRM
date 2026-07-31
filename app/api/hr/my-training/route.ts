import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { trainingEnrollments, certifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const [enrollments, certs] = await Promise.all([
      db.query.trainingEnrollments.findMany({
        where: eq(trainingEnrollments.userId, session.user.id),
        with: { program: true },
        orderBy: [desc(trainingEnrollments.enrolledAt)],
      }),
      db.query.certifications.findMany({
        where: eq(certifications.userId, session.user.id),
        orderBy: [desc(certifications.createdAt)],
      }),
    ]);

    return ok({ enrollments, certifications: certs });
  });
}
