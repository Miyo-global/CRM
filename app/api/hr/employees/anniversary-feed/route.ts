import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format, addYears, differenceInDays, startOfDay } from "date-fns";

interface FeedItem {
  userId: string;
  name: string | null;
  image: string | null;
  type: "BIRTHDAY" | "WORK_ANNIVERSARY";
  daysAway: number;
  dateStr: string;
  yearsCount?: number;
}


export async function GET() {
  return withAuth(async (session) => {
    const members = await db
      .select({
        userId: organizationMembers.userId,
        name: users.name,
        image: users.image,
        dateOfBirth: users.dateOfBirth,
        joiningDate: users.joiningDate,
      })
      .from(organizationMembers)
      .leftJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.orgId, session.orgId));

    const today = startOfDay(new Date());
    const items: FeedItem[] = [];

    for (const m of members) {
      if (!m.name) continue;

      if (m.dateOfBirth) {
        const dob = new Date(m.dateOfBirth);
        let nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (nextBirthday < today) nextBirthday = addYears(nextBirthday, 1);
        const days = differenceInDays(nextBirthday, today);
        if (days <= 30) {
          items.push({
            userId: m.userId,
            name: m.name,
            image: m.image,
            type: "BIRTHDAY",
            daysAway: days,
            dateStr: format(nextBirthday, "MMM d"),
          });
        }
      }

      if (m.joiningDate) {
        const joined = new Date(m.joiningDate);
        const yearsCompleted = today.getFullYear() - joined.getFullYear();
        if (yearsCompleted >= 1) {
          let nextAnniversary = new Date(today.getFullYear(), joined.getMonth(), joined.getDate());
          if (nextAnniversary < today) nextAnniversary = addYears(nextAnniversary, 1);
          const days = differenceInDays(nextAnniversary, today);
          if (days <= 30) {
            const years =
              nextAnniversary.getFullYear() - joined.getFullYear();
            items.push({
              userId: m.userId,
              name: m.name,
              image: m.image,
              type: "WORK_ANNIVERSARY",
              daysAway: days,
              dateStr: format(nextAnniversary, "MMM d"),
              yearsCount: years,
            });
          }
        }
      }
    }

    items.sort((a, b) => a.daysAway - b.daysAway);
    return ok(items);
  });
}
