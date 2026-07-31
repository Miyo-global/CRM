import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        designation: users.designation,
        image: users.image,
        dateOfBirth: users.dateOfBirth,
        joiningDate: users.joiningDate,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          eq(users.isActive, true)
        )
      );

    const today = new Date();

    const upcoming: {
      id: string;
      name: string | null;
      designation: string | null;
      image: string | null;
      type: "birthday" | "anniversary";
      date: string;
      yearsCompleted?: number;
    }[] = [];

    for (const member of members) {
      for (let offset = 0; offset <= 7; offset++) {
        const check = new Date(today);
        check.setDate(today.getDate() + offset);
        const cm = check.getMonth() + 1;
        const cd = check.getDate();

        if (member.dateOfBirth) {
          const dob = new Date(member.dateOfBirth);
          if (dob.getMonth() + 1 === cm && dob.getDate() === cd) {
            upcoming.push({
              id: member.id,
              name: member.name,
              designation: member.designation,
              image: member.image,
              type: "birthday",
              date: formatDateOnly(check),
            });
          }
        }

        if (member.joiningDate) {
          const jd = new Date(member.joiningDate);
          if (jd.getMonth() + 1 === cm && jd.getDate() === cd) {
            const years = check.getFullYear() - jd.getFullYear();
            if (years > 0) {
              upcoming.push({
                id: member.id,
                name: member.name,
                designation: member.designation,
                image: member.image,
                type: "anniversary",
                date: formatDateOnly(check),
                yearsCompleted: years,
              });
            }
          }
        }
      }
    }

    const seen = new Set<string>();
    const deduped = upcoming.filter((u) => {
      const key = `${u.id}-${u.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return ok(deduped.slice(0, 20));
  });
}
