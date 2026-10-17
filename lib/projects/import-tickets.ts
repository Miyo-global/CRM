import { parseCsvRecords } from "@/lib/import/parse-csv";
import type { CreateTicketInput } from "@/lib/projects/create-ticket";

/**
 * MIYO-0121: turn a CSV into ticket inputs. Columns are matched by header
 * name, case-insensitively, with a few aliases so an export from elsewhere
 * usually lands without editing. Only Title is required.
 */
export const IMPORT_COLUMNS: Record<string, string[]> = {
  title: ["title", "summary", "name"],
  description: ["description", "details"],
  type: ["type", "issue type"],
  status: ["status"],
  priority: ["priority"],
  points: ["points", "story points"],
  estimate: ["estimate", "original estimate", "estimate hours"],
  dueDate: ["due date", "duedate", "due"],
  assignee: ["assignee", "assignee email", "assigned to"],
};

const TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export interface ImportRow {
  /** 1-based line in the file, counting the header, so it matches a spreadsheet. */
  line: number;
  ok: boolean;
  error?: string;
  title: string;
  assigneeEmail?: string;
  input?: CreateTicketInput;
}

function pick(record: Record<string, string>, field: keyof typeof IMPORT_COLUMNS): string {
  for (const alias of IMPORT_COLUMNS[field]) {
    const value = record[alias];
    if (value) return value;
  }
  return "";
}

/** Parse and validate; nothing here touches the database. */
export function readTicketCsv(
  csv: string,
  options: { statuses?: string[] } = {},
): { headers: string[]; rows: ImportRow[] } {
  const { headers, records } = parseCsvRecords(csv);

  const rows = records.map((record, index): ImportRow => {
    const line = index + 2;
    const title = pick(record, "title");
    const assigneeEmail = pick(record, "assignee").toLowerCase() || undefined;
    const fail = (error: string): ImportRow => ({ line, ok: false, error, title, assigneeEmail });

    if (!title) return fail("Title is empty.");
    if (title.length > 500) return fail("Title is longer than 500 characters.");

    const typeRaw = pick(record, "type").toUpperCase();
    const type = typeRaw === "FEATURE" ? "STORY" : typeRaw;
    if (type && !TYPES.includes(type as (typeof TYPES)[number])) {
      return fail(`Type "${typeRaw}" is not one of ${TYPES.join(", ")}.`);
    }

    const priority = pick(record, "priority").toUpperCase();
    if (priority && !PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) {
      return fail(`Priority "${priority}" is not one of ${PRIORITIES.join(", ")}.`);
    }

    const status = pick(record, "status").toUpperCase().replace(/\s+/g, "_");
    if (status && options.statuses && !options.statuses.includes(status)) {
      return fail(`Status "${status}" is not a column in this project.`);
    }

    const pointsRaw = pick(record, "points");
    const points = pointsRaw ? Number(pointsRaw) : undefined;
    if (points !== undefined && (!Number.isInteger(points) || points < 0 || points > 1000)) {
      return fail(`Points "${pointsRaw}" is not a whole number between 0 and 1000.`);
    }

    const estimateRaw = pick(record, "estimate");
    const estimate = estimateRaw ? Number(estimateRaw) : undefined;
    if (estimate !== undefined && (Number.isNaN(estimate) || estimate < 0)) {
      return fail(`Estimate "${estimateRaw}" is not a number of hours.`);
    }

    const dueDate = pick(record, "dueDate");
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return fail(`Due date "${dueDate}" is not in YYYY-MM-DD form.`);
    }

    return {
      line,
      ok: true,
      title,
      assigneeEmail,
      input: {
        title,
        description: pick(record, "description") || undefined,
        type: (type || "TASK") as CreateTicketInput["type"],
        priority: (priority || undefined) as CreateTicketInput["priority"],
        points,
        originalEstimate: estimate,
        dueDate: dueDate || undefined,
        status: status || undefined,
      },
    };
  });

  return { headers, rows };
}
