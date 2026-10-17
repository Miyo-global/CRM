import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./db/schema";

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL environment variable is required.");
}

function normalizeDatabaseUrl(url: string): string {
  if (!/\.neon\.tech/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url.replace(/[&?]channel_binding=[^&]*/g, "").replace(/\?&/, "?");
  }
}

const connectionString = normalizeDatabaseUrl(rawDatabaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __postgresClient?: ReturnType<typeof postgres>;
};

const isNeonHost = /\.neon\.tech/i.test(connectionString);
const isDev = process.env.NODE_ENV === "development";
const isServerless = process.env.VERCEL === "1";

// MIYO-0107: each serverless instance keeps its own pool, so 15 per instance
// exhausted the database connection limit under load. A serverless function
// handles one request at a time, so a handful of connections is plenty; the
// pooled (PgBouncer / Neon -pooler) host does the real multiplexing.
const max = isServerless ? 3 : isDev ? 5 : 75;

if (isServerless && isNeonHost && !/-pooler\./i.test(connectionString)) {
  console.warn(
    "[db] DATABASE_URL points at a direct Neon host. Use the -pooler host on serverless (MIYO-0107).",
  );
}

function createPostgresClient() {
  return postgres(connectionString, {
    prepare: false,
    max,
    idle_timeout: isServerless ? 10 : isDev ? 20 : 60,
    connect_timeout: isNeonHost ? 60 : 30,
    max_lifetime: isServerless ? 60 * 5 : 60 * 30,
    ...(isNeonHost ? { ssl: "require" as const } : {}),
  });
}

export const client = (globalForDb.__postgresClient ??= createPostgresClient());
export const db = drizzle(client, { schema });
