import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  isBirthdayToday,
  isUpcomingBirthdaySoon,
} from "@/lib/hr/upcoming-birthdays";

export async function GET() {
  return withAuth(async (session) => {
    const now = new Date();

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        dateOfBirth: users.dateOfBirth,
        joiningDate: users.joiningDate,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(eq(organizationMembers.orgId, session.orgId), eq(users.isActive, true)));

    const birthdays: typeof members = [];
    const anniversaries: (typeof members[0] & { years: number })[] = [];
    const upcomingBirthdays: typeof members = [];

    for (const m of members) {
      if (m.dateOfBirth) {
        if (isBirthdayToday(m.dateOfBirth, now)) {
          birthdays.push(m);
        } else if (isUpcomingBirthdaySoon(m.dateOfBirth, now)) {
          upcomingBirthdays.push(m);
        }
      }
      if (m.joiningDate) {
        const jd = new Date(m.joiningDate);
        const jdMonth = jd.getMonth() + 1;
        const jdDay = jd.getDate();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        if (jdMonth === month && jdDay === day) {
          const years = now.getFullYear() - jd.getFullYear();
          if (years > 0) {
            anniversaries.push({ ...m, years });
          }
        }
      }
    }

    return ok({
      todayBirthdays: birthdays,
      upcomingBirthdays,
      todayAnniversaries: anniversaries,
    });
  });
}
