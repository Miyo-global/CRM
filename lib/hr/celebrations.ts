/**
 * Who to greet today (A34).
 *
 * Dates are compared in IST (the caller passes today's IST date), so a run just
 * after midnight UTC does not greet a day early. A 29 February birthday is
 * greeted on 28 February in a non-leap year, rather than skipped for three
 * years at a time.
 */

export interface CelebrationMember {
  id: string;
  name: string | null;
  email: string | null;
  dateOfBirth?: string | null;
  joiningDate?: string | null;
}

export interface Celebration {
  userId: string;
  name: string | null;
  email: string | null;
  type: "birthday" | "anniversary";
  /** Completed years, for an anniversary. */
  yearsCompleted?: number;
  /** Start date, shown in the anniversary mail (MIYO-0165). */
  joiningDate?: string | null;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Whether a month/day anniversary of `date` falls on `today` (YYYY-MM-DD, IST). */
export function fallsOnDate(date: string, today: string): boolean {
  const [, month, day] = date.slice(0, 10).split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.slice(0, 10).split("-").map(Number);
  if (!month || !day || !todayYear || !todayMonth || !todayDay) return false;

  if (month === todayMonth && day === todayDay) return true;

  // 29 February in a year that has no 29 February: greet on the 28th.
  if (month === 2 && day === 29 && todayMonth === 2 && todayDay === 28 && !isLeapYear(todayYear)) {
    return true;
  }
  return false;
}

export function celebrationsOn(
  members: CelebrationMember[],
  today: string,
): { birthdays: Celebration[]; anniversaries: Celebration[] } {
  const todayYear = Number(today.slice(0, 4));
  const birthdays: Celebration[] = [];
  const anniversaries: Celebration[] = [];

  for (const member of members) {
    if (member.dateOfBirth && fallsOnDate(member.dateOfBirth, today)) {
      birthdays.push({
        userId: member.id,
        name: member.name,
        email: member.email,
        type: "birthday",
      });
    }

    if (member.joiningDate && fallsOnDate(member.joiningDate, today)) {
      const yearsCompleted = todayYear - Number(member.joiningDate.slice(0, 4));
      // The joining day itself is not an anniversary.
      if (yearsCompleted > 0) {
        anniversaries.push({
          userId: member.id,
          name: member.name,
          email: member.email,
          type: "anniversary",
          yearsCompleted,
          joiningDate: member.joiningDate,
        });
      }
    }
  }

  return { birthdays, anniversaries };
}

/** Stable key, one greeting per person per type per year. */
export function celebrationKey(
  type: Celebration["type"],
  userId: string,
  year: number,
): string {
  return `${type}:${userId}:${year}`;
}
