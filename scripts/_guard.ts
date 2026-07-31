import * as readline from "readline";
import { randomBytes } from "crypto";

const CLOUD_HOST_MARKERS = [
  "neon.tech",
  "supabase",
  "amazonaws",
  "rds.",
  "render.com",
  "azure",
  "cockroachlabs",
  "planetscale",
];

export function assertNotProduction(scriptName: string): void {
  if (process.env.NODE_ENV === "production") {
    console.error(`FATAL: ${scriptName} must not run with NODE_ENV=production.`);
    process.exit(1);
  }
}

export function assertLocalDatabase(
  scriptName: string,
  overrideEnv = "ALLOW_REMOTE_DB"
): void {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const isCloud = CLOUD_HOST_MARKERS.some((m) => dbUrl.includes(m));
  if (isCloud && process.env[overrideEnv] !== "1") {
    console.error(`FATAL: ${scriptName} refuses to run against a cloud-hosted database.`);
    console.error(`Set ${overrideEnv}=1 to override this safety check.`);
    process.exit(1);
  }
}

export async function confirmDestructive(phrase: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) =>
    rl.question(`This is a destructive operation. Type '${phrase}' to confirm: `, resolve)
  );
  rl.close();
  if (answer !== phrase) {
    console.error("Aborted.");
    process.exit(1);
  }
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGIT = "23456789";
const SPECIAL = "@$!%*?&";

export function generatePassword(length = 16): string {
  const all = UPPER + LOWER + DIGIT + SPECIAL;
  const pick = (set: string) => set[randomBytes(1)[0] % set.length];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SPECIAL)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
