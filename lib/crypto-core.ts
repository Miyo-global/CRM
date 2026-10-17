/**
 * AES-256-GCM helpers with no "server-only" guard, so the Drizzle schema (also
 * loaded by scripts) can use them. App code imports lib/secret-crypto instead.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const VERSION = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not configured; cannot encrypt/decrypt secrets at rest");
  }
  return createHash("sha256").update(raw).digest();
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(VERSION);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** GCM authentication tag length, in bytes. */
const AUTH_TAG_BYTES = 16;

export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    VERSION +
    [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":")
  );
}

export function decryptSecret(value: string): string {
  if (!isEncrypted(value)) {
    return value;
  }
  const key = getKey();
  const parts = value.slice(VERSION.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted secret");
  }
  const [ivB64, tagB64, ctB64] = parts;
  // SEC-0017: a GCM tag is 16 bytes. Say so, and reject a truncated one
  // rather than letting setAuthTag accept it.
  const tag = Buffer.from(tagB64, "base64");
  if (tag.length !== AUTH_TAG_BYTES) {
    throw new Error("Malformed encrypted secret");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"), {
    authTagLength: AUTH_TAG_BYTES,
  });
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
