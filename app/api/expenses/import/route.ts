import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses, organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import {
  IMPORT_ALLOWED_EXTENSIONS,
  IMPORT_ALLOWED_MIME_TYPES,
  IMPORT_MAX_FILE_SIZE_BYTES,
  validateFileTypeAndSize,
} from "@/lib/files/expense-file-validation";

const MAX_ROWS = 10_000;

const ALLOWED_CATEGORIES = new Set([
  "Travel", "Food", "Office Supplies", "Software", "Hardware",
  "Marketing", "Entertainment", "Utilities", "Rent", "Insurance",
  "Salary", "Miscellaneous", "Other",
]);

function sanitizeCell(value: string): string {
  return value.replace(/^[=+\-@\t\r]+/, "").trim();
}

function normalizeHeader(header: string): string {
  return sanitizeCell(String(header)).toLowerCase().replace(/[\s_-]+/g, "");
}

function excelSerialToIsoDate(serial: number): string {

  const epoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(epoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return date.toISOString().split("T")[0];
}

function normalizeDate(value: string): string | null {
  const cleaned = sanitizeCell(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return null;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out.map((v) => v.replace(/^["']|["']$/g, ""));
}

interface ParsedImportRow {
  rowNumber: number;
  record: Record<string, string>;
}

async function readRowsFromFile(file: File): Promise<ParsedImportRow[]> {
  const lowerName = file.name.toLowerCase();
  const isXlsx =
    lowerName.endsWith(".xlsx") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (isXlsx) {
    const buf = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buf);
    const ws = workbook.worksheets[0];
    if (!ws) return [];

    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = normalizeHeader(String(cell.value ?? ""));
    });

    const rows: ParsedImportRow[] = [];
    for (let rowNumber = 2; rowNumber <= ws.rowCount && rows.length < MAX_ROWS; rowNumber++) {
      const row = ws.getRow(rowNumber);
      const record: Record<string, string> = {};
      let hasAnyValue = false;
      for (let col = 1; col <= headers.length; col++) {
        const key = headers[col - 1];
        if (!key) continue;
        const cellValue = row.getCell(col).value;
        let val = "";
        if (cellValue instanceof Date) {
          val = cellValue.toISOString().split("T")[0];
        } else if (typeof cellValue === "number") {
          val = key.includes("date") ? excelSerialToIsoDate(cellValue) : String(cellValue);
        } else if (cellValue && typeof cellValue === "object" && "text" in cellValue) {
          val = String(cellValue.text ?? "");
        } else if (cellValue != null) {
          val = String(cellValue);
        }
        if (sanitizeCell(val) !== "") hasAnyValue = true;
        record[key] = sanitizeCell(val);
      }
      if (hasAnyValue) rows.push({ rowNumber, record });
    }
    return rows;
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => normalizeHeader(h));
  const rows = lines.slice(1, MAX_ROWS + 1);
  return rows.map((line, idx) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = sanitizeCell(values[i] || "");
    });
    return { rowNumber: idx + 2, record };
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, session.user.id),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!member) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const isAdmin = member.role === "CEO" || member.role === "HR" || member.role === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Only HR and CEO can import expenses" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const autoApproveRaw = formData.get("autoApprove");
    const categoryMappingRaw = formData.get("categoryMapping");
    const autoApprove = autoApproveRaw === "true";
    const categoryMapping: Record<string, string> =
      typeof categoryMappingRaw === "string"
        ? (() => {
          try {
            const parsed = JSON.parse(categoryMappingRaw) as Record<string, string>;
            return parsed && typeof parsed === "object" ? parsed : {};
          } catch {
            return {};
          }
        })()
        : {};
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileError = validateFileTypeAndSize({
      file,
      allowedMimeTypes: IMPORT_ALLOWED_MIME_TYPES,
      allowedExtensions: IMPORT_ALLOWED_EXTENSIONS,
      maxSizeBytes: IMPORT_MAX_FILE_SIZE_BYTES,
    });
    if (fileError) {
      const message = fileError === "File type not supported" ? "Only CSV or Excel files are allowed" : fileError;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const rows = await readRowsFromFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: "File must contain a header row and at least one data row" }, { status: 400 });
    }

    const batchValues: Array<{
      orgId: string;
      userId: string;
      category: string;
      amount: string;
      description: string;
      merchant: string;
      paymentMethod: string | null;
      expenseDate: string;
      status: "PENDING" | "APPROVED";
      approverId: string | null;
      approvedAt: Date | null;
    }> = [];

    let skipped = 0;
    let duplicates = 0;
    const skippedReasons: Array<{ row: number; reason: string }> = [];
    const seenKeys = new Set<string>();
    const existingKeys = new Set<string>();

    const buildDedupeKey = (
      date: string,
      amountValue: number,
      merchantValue: string,
      descriptionValue: string
    ): string =>
      [
        date,
        amountValue.toFixed(2),
        merchantValue.toLowerCase().slice(0, 200),
        descriptionValue.toLowerCase().slice(0, 500),
      ].join("|");

    const today = new Date().toISOString().split("T")[0];

    const existingRows = await db
      .select({
        expenseDate: expenses.expenseDate,
        amount: expenses.amount,
        merchant: expenses.merchant,
        description: expenses.description,
      })
      .from(expenses)
      .where(and(eq(expenses.orgId, member.orgId), eq(expenses.userId, session.user.id)));
    for (const existing of existingRows) {
      const existingAmount = parseFloat(existing.amount);
      if (Number.isNaN(existingAmount)) continue;
      existingKeys.add(
        buildDedupeKey(
          existing.expenseDate,
          existingAmount,
          existing.merchant ?? "",
          existing.description ?? ""
        )
      );
    }

    for (const parsedRow of rows) {
      const { rowNumber, record } = parsedRow;
      const rawCategory = sanitizeCell(record.category || "Other");
      const mappedCategory = sanitizeCell(categoryMapping[rawCategory] || rawCategory);
      const category = ALLOWED_CATEGORIES.has(mappedCategory) ? mappedCategory : "Other";
      const amount = parseFloat(record.amount);
      if (isNaN(amount) || amount <= 0 || amount > 100_000_000) {
        skipped++;
        skippedReasons.push({
          row: rowNumber,
          reason: "Invalid amount (must be a positive number up to 100000000)",
        });
        continue;
      }

      const description = sanitizeCell(record.description || "");
      const merchant = sanitizeCell(record.merchant || "");
      const paymentMethod = sanitizeCell(
        record.paymentmethod || record["payment_method"] || record["payment method"] || ""
      );
      const expenseDate = record.expensedate || record.date || "";
      const validDate = normalizeDate(expenseDate);
      if (!validDate) {
        skipped++;
        skippedReasons.push({
          row: rowNumber,
          reason: "Invalid date (expected YYYY-MM-DD or valid date value)",
        });
        continue;
      }
      if (validDate > today) {
        skipped++;
        skippedReasons.push({
          row: rowNumber,
          reason: "Expense date cannot be in the future",
        });
        continue;
      }

      const dedupeKey = buildDedupeKey(validDate, amount, merchant, description);
      if (seenKeys.has(dedupeKey)) {
        duplicates++;
        skippedReasons.push({
          row: rowNumber,
          reason: "Duplicate row in this import (same date, amount, merchant, description)",
        });
        continue;
      }
      if (existingKeys.has(dedupeKey)) {
        duplicates++;
        skippedReasons.push({
          row: rowNumber,
          reason: "Duplicate of an existing expense (same date, amount, merchant, description)",
        });
        continue;
      }
      seenKeys.add(dedupeKey);

      batchValues.push({
        orgId: member.orgId,
        userId: session.user.id,
        category,
        amount: amount.toString(),
        description: description.slice(0, 500),
        merchant: merchant.slice(0, 200),
        paymentMethod: paymentMethod || null,
        expenseDate: validDate,
        status: autoApprove ? "APPROVED" : "PENDING",
        approverId: autoApprove ? session.user.id : null,
        approvedAt: autoApprove ? new Date() : null,
      });
    }

    if (batchValues.length > 0) {
      await db.transaction(async (tx) => {
        for (let i = 0; i < batchValues.length; i += 500) {
          const batch = batchValues.slice(i, i + 500);
          await tx.insert(expenses).values(batch);
        }
      });
    }

    return NextResponse.json({
      success: true,
      count: batchValues.length,
      skipped,
      duplicates,
      skippedReasons,
      ...(rows.length >= MAX_ROWS ? { warning: `Only first ${MAX_ROWS} rows were processed` } : {}),
    });
  } catch (error) {
    logger.error("Expense import error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Failed to import expenses" }, { status: 500 });
  }
}
