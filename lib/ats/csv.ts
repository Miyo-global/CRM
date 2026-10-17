/**
 * MIYO-0649: a small CSV reader for the candidate import. Handles quoted
 * fields, embedded commas and doubled quotes — enough for a file exported
 * from a spreadsheet, and no dependency.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export interface CsvCandidate {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  source?: string;
}

/** Map a header row onto the fields the importer understands. */
export function mapCsvCandidates(rows: string[][]): {
  candidates: CsvCandidate[];
  skipped: { line: number; reason: string }[];
} {
  if (rows.length === 0) return { candidates: [], skipped: [] };

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const index = (...names: string[]) => header.findIndex((h) => names.includes(h));

  const columns = {
    firstName: index("firstname", "first", "givenname"),
    lastName: index("lastname", "last", "surname"),
    name: index("name", "fullname", "candidate"),
    email: index("email", "emailaddress", "mail"),
    phone: index("phone", "mobile", "phonenumber", "contact"),
    linkedinUrl: index("linkedin", "linkedinurl", "profile"),
    source: index("source", "channel"),
  };

  const candidates: CsvCandidate[] = [];
  const skipped: { line: number; reason: string }[] = [];

  rows.slice(1).forEach((row, i) => {
    const line = i + 2;
    const cell = (at: number) => (at >= 0 ? (row[at] ?? "").trim() : "");

    const email = cell(columns.email).toLowerCase();
    if (!email || !email.includes("@")) {
      skipped.push({ line, reason: "no email address" });
      return;
    }

    let firstName = cell(columns.firstName);
    let lastName = cell(columns.lastName);
    if (!firstName && columns.name >= 0) {
      const parts = cell(columns.name).split(/\s+/);
      firstName = parts[0] ?? "";
      lastName = parts.slice(1).join(" ");
    }
    if (!firstName) {
      skipped.push({ line, reason: "no name" });
      return;
    }

    candidates.push({
      firstName,
      lastName: lastName || "—",
      email,
      phone: cell(columns.phone) || undefined,
      linkedinUrl: cell(columns.linkedinUrl) || undefined,
      source: cell(columns.source) || undefined,
    });
  });

  return { candidates, skipped };
}
