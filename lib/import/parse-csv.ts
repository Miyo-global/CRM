/**
 * Minimal RFC 4180 CSV reader for pasted or uploaded files (MIYO-0121).
 * Handles quoted fields, escaped quotes, embedded commas and newlines, and
 * both CRLF and LF. Anything fancier belongs in a library, not here.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let started = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
    started = false;
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field === "") {
      quoted = true;
      started = true;
    } else if (char === ",") {
      endField();
      started = true;
    } else if (char === "\n") {
      endRow();
    } else if (char === "\r") {
      // part of CRLF; the \n ends the row
    } else {
      field += char;
      started = true;
    }
  }

  if (started || field !== "" || row.length > 0) endRow();

  // A trailing newline leaves one empty row behind.
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

/**
 * Rows as objects keyed by the header row, lower-cased and trimmed so
 * "Due Date", "due date" and "DUE DATE" all land on the same key.
 */
export function parseCsvRecords(input: string): {
  headers: string[];
  records: Record<string, string>[];
} {
  const rows = parseCsv(input);
  if (rows.length === 0) return { headers: [], records: [] };

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const records = rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = (row[i] ?? "").trim();
    });
    return record;
  });

  return { headers, records };
}
