import { db } from "@/lib/db";
import { holidays, organizations } from "@/lib/db/schema";

interface HolidayEntry {
  name: string;
  date: string;
  message?: string;
}
const YOUR_HOLIDAYS: HolidayEntry[] = [
  { name: "New Year Eve", date: "2026-01-01" },
  { name: "Bhogi", date: "2026-01-13" },
  { name: "Makar Sankranthi", date: "2026-01-14" },
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Holi", date: "2026-03-04" },
  { name: "Ugadi", date: "2026-03-19" },
  { name: "Eid", date: "2026-03-21" },
  { name: "Bakrid", date: "2026-05-27" },
  { name: "Independence Day", date: "2026-08-15" },
  { name: "Ganesh Chaturthi", date: "2026-09-14" },
  { name: "Gandhi Jayanthi", date: "2026-10-02" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Christmas Day", date: "2026-12-25" },
];

async function importHolidays() {
  try {
    if (YOUR_HOLIDAYS.length === 0) {
      console.error("❌ No holidays found!");
      process.exit(1);
    }

    const orgs = await db.query.organizations.findMany();

    if (orgs.length === 0) {
      console.error("❌ No organizations found. Please create an organization first.");
      process.exit(1);
    }

    for (const org of orgs) {
      const holidayRecords = YOUR_HOLIDAYS.map(h => ({
        orgId: org.id,
        name: h.name,
        date: h.date,
        message: h.message,
        notificationSent: false,
      }));

      await db.insert(holidays).values(holidayRecords);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to import holidays:", error);
    process.exit(1);
  }
}

importHolidays();

