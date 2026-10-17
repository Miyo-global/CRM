import { customType } from "drizzle-orm/pg-core";
import { decryptSecret, encryptSecret, isEncrypted } from "@/lib/crypto-core";

/**
 * Columns encrypted at rest with AES-256-GCM (SEC-0006 / MIYO-0077). Values
 * are encrypted on write and decrypted on read, so every query through Drizzle
 * sees plaintext and the table holds `enc:v1:` ciphertext. Rows written before
 * this change are plaintext and still read as-is until backfilled
 * (scripts/encrypt-pii-backfill.ts). Ciphertext uses a random IV, so these
 * columns cannot be filtered or matched by value in SQL.
 */
export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => (isEncrypted(value) ? value : encryptSecret(value)),
  fromDriver: (value) => decryptSecret(value),
});

/** jsonb holding either a legacy plain object or a JSON string of ciphertext. */
export function encryptedJson<T>(name: string) {
  return customType<{ data: T; driverData: unknown }>({
    dataType: () => "jsonb",
    toDriver: (value) => JSON.stringify(encryptSecret(JSON.stringify(value))),
    fromDriver: (raw) => {
      const parsed = typeof raw === "string" ? safeParse(raw) : raw;
      if (typeof parsed === "string" && isEncrypted(parsed)) return JSON.parse(decryptSecret(parsed)) as T;
      return parsed as T;
    },
  })(name);
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
