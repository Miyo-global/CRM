import { withAuth, ok, err } from "@/lib/api/helpers";
import { generateTotpSecret, generateTotpUri, generateQrCodeDataUrl, generateBackupCodes, hashBackupCode } from "@/lib/totp";
import { encryptSecret } from "@/lib/secret-crypto";
import { db } from "@/lib/db";
import { users, mfaBackupCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  return withAuth(async (session) => {
    const existing = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { totpEnabled: true },
    });
    if (existing?.totpEnabled) {
      return err("MFA is already enabled. Disable it before setting up again.", 409);
    }

    const secret = generateTotpSecret();
    const uri = generateTotpUri(secret, session.user.email ?? session.user.id);
    const qrDataUrl = await generateQrCodeDataUrl(uri);

    const plainCodes = generateBackupCodes();
    const hashedCodes = await Promise.all(plainCodes.map(hashBackupCode));

    await db.transaction(async (tx) => {
      await tx.update(users).set({ totpSecret: encryptSecret(secret) }).where(eq(users.id, session.user.id));

      await tx.delete(mfaBackupCodes).where(
        eq(mfaBackupCodes.userId, session.user.id)
      );

      await tx.insert(mfaBackupCodes).values(
        hashedCodes.map((codeHash) => ({
          userId: session.user.id,
          codeHash,
        }))
      );
    });

    return ok({ qrDataUrl, secret, manualEntryKey: secret, backupCodes: plainCodes });
  });
}
