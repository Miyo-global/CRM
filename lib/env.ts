import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .refine(
      (val) => process.env.NODE_ENV !== "production" || val.length >= 44,
      "In production, NEXTAUTH_SECRET must be at least 44 characters (256-bit base64)"
    ),

  ENCRYPTION_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  // Outbound mail. ZeptoMail (Zoho) is the default transport; SendGrid is kept
  // as a fallback so an existing deployment can switch back with one env var.
  EMAIL_PROVIDER: z.enum(["zeptomail", "sendgrid"]).default("zeptomail"),

  ZEPTOMAIL_TOKEN: z.string().optional(),
  ZEPTOMAIL_API_URL: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  ZEPTOMAIL_BOUNCE_ADDRESS: z.string().optional(),

  SENDGRID_API_KEY: z.string().optional(),

  EMAIL_FROM_ADDRESS: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_REPLY_TO: z.string().email().optional().or(z.literal("").transform(() => undefined)),

  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  R2_REGION: z.string().default("auto"),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  ABLY_API_KEY: z.string().optional(),

  BIOMETRIC_API_KEY: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),

  ALLOW_TEST_EMAIL: z.string().optional(),
  TEST_EMAIL: z.string().email().optional().or(z.literal("")),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_QR_REDIRECT_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

function validateEnv() {
  const result = serverSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`[env] Validation failed:\n${issues}`);

    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing or invalid required environment variables");
    }
  }

  return result.success
    ? result.data
    : (process.env as unknown as z.infer<typeof serverSchema>);
}

function validateClientEnv() {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_QR_REDIRECT_BASE_URL: process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL,
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  return result.success ? result.data : ({} as z.infer<typeof clientSchema>);
}

export const serverEnv = validateEnv();
export const clientEnv = validateClientEnv();
