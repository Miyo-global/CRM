import { generateSecret, generateURI, generateSync, verifySync } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function generateTotpUri(secret: string, email: string): string {
  return generateURI({ secret, label: email, issuer: "Miyo Global CRM", strategy: "totp" });
}

export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri);
}

export function generateTotpToken(secret: string): string {
  return generateSync({ secret, strategy: "totp" });
}

export function totpTimeStep(periodSeconds = 30): number {
  return Math.floor(Date.now() / 1000 / periodSeconds);
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const result = verifySync({ secret, token, strategy: "totp" });
    return result.valid;
  } catch {
    return false;
  }
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () => {
    const part1 = randomBytes(3).toString("hex").toUpperCase();
    const part2 = randomBytes(3).toString("hex").toUpperCase();
    return `${part1}-${part2}`;
  });
}

export async function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyBackupCode(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
