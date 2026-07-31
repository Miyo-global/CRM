import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required in .env");

const COLUMNS: [string, string][] = [
  ["role", "text"],
  ["work_mode", "text"],
  ["country", "text"],
  ["state_city", "text"],
  ["office_location", "text"],
  ["currency", "text DEFAULT 'INR'"],
  ["salary_type", "text DEFAULT 'ANNUAL'"],
  ["bonus", "text"],
  ["min_experience", "integer"],
  ["max_experience", "integer"],
  ["education_level", "text"],
  ["required_skills", "text[]"],
  ["preferred_skills", "text[]"],
  ["tags", "text[]"],
  ["overview", "text"],
  ["responsibilities", "text"],
  ["hiring_manager", "text"],
  ["interview_rounds", "text[]"],
  ["question_bank", "text"],
  ["resume_required", "boolean DEFAULT true"],
  ["cover_letter_required", "boolean DEFAULT false"],
  ["custom_fields", "text[]"],
  ["visibility", "text DEFAULT 'PUBLIC'"],
  ["priority", "text DEFAULT 'MEDIUM'"],
  ["referral_enabled", "boolean DEFAULT false"],
  ["approval_required", "boolean DEFAULT false"],
];

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1 });
  try {
    await sql.unsafe(`ALTER TABLE job_postings DROP COLUMN IF EXISTS question_bank_id`);
    for (const [name, type] of COLUMNS) {
      await sql.unsafe(`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS ${name} ${type}`);
    }
    const cols = await sql<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'job_postings' ORDER BY ordinal_position
    `;
    console.log(`job_postings now has ${cols.length} columns:`, cols.map((c) => c.column_name).join(", "));
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
