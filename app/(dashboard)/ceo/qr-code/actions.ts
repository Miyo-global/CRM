"use server";

import { z } from "zod";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { qrCodes, users } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { generateQRCodeWithLogo } from "@/lib/qr-code";
import { uploadFile, deleteFile, getFileKeyFromUrl, getFileUrl, isStorageConfigured } from "@/lib/storage";
import { appUrl } from "@/lib/app-url";
import { existsSync } from "fs";
import { resolvePublicPath } from "@/lib/constants/paths";
import { auth } from "@/lib/auth";

const generateSchema = z.object({
  targetUrl: z.string().url().max(2048),
  orgId: z.string(),
});

export async function generateQRCode(formData: FormData) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Access Denied: You must be logged in to generate QR codes." };
    }

    const rawData = {
      targetUrl: formData.get("targetUrl"),
      orgId: formData.get("orgId"),
    };

    const validatedData = generateSchema.parse(rawData);

    if (session.user.role !== "CEO" && session.user.role !== "HR") {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });

      if (!user || (user.role !== "CEO" && user.role !== "HR")) {
        return { success: false, error: "Access Denied: Only CEO and HR can generate QR codes." };
      }
    }

    const userMembership = await db.query.organizationMembers.findFirst({
      where: (members, { eq: eqFn }) => and(
        eqFn(members.userId, session.user.id),
        eqFn(members.orgId, validatedData.orgId)
      ),
    });

    if (!userMembership) {
      return { success: false, error: "Access Denied: You don't have access to this organization." };
    }

    let slug = nanoid(8);
    let existing = await db.query.qrCodes.findFirst({
      where: eq(qrCodes.slug, slug),
    });

    let attempts = 0;
    while (existing && attempts < 5) {
      slug = nanoid(8);
      existing = await db.query.qrCodes.findFirst({
        where: eq(qrCodes.slug, slug),
      });
      attempts++;
    }

    if (existing) {
      return { success: false, error: "Failed to generate unique slug" };
    }

    const redirectBaseUrl = process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL || appUrl;

    if (!redirectBaseUrl) {
      return {
        success: false,
        error: "NEXT_PUBLIC_QR_REDIRECT_BASE_URL or NEXTAUTH_URL must be set for production",
      };
    }

    const trackingUrl = `${redirectBaseUrl}/qr/${slug}`;

    const qrBuffer = await generateQRCodeWithLogo({
      url: trackingUrl,
      qrSize: 1000,
      errorCorrectionLevel: "H",
      margin: 2,
    });

    let imageUrl: string;

    if (!isStorageConfigured()) {
      return { success: false, error: "Cloud storage (R2) is not configured. Contact your administrator." };
    }

    try {
      const uploadResult = await uploadFile(
        qrBuffer,
        "qr-codes",
        `${slug}.png`,
        "image/png"
      );
      imageUrl = uploadResult.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: `Failed to upload QR code: ${errorMessage}` };
    }

    await db.insert(qrCodes).values({
      orgId: validatedData.orgId,
      targetUrl: validatedData.targetUrl,
      slug: slug,
      imageUrl: imageUrl,
      scanCount: 0,
    });

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate QR code";
    return { success: false, error: errorMessage };
  }
}

export async function deleteQRCode(id: number) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Access Denied: You must be logged in to delete QR codes." };
    }

    const qrCode = await db.query.qrCodes.findFirst({
      where: eq(qrCodes.id, id),
    });

    if (!qrCode) {
      return { success: false, error: "QR code not found" };
    }

    if (session.user.role !== "CEO" && session.user.role !== "HR") {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });

      if (!user || (user.role !== "CEO" && user.role !== "HR")) {
        return { success: false, error: "Access Denied: Only CEO and HR can delete QR codes." };
      }
    }

    const userMembership = await db.query.organizationMembers.findFirst({
      where: (members, { eq: eqFn }) => and(
        eqFn(members.userId, session.user.id),
        eqFn(members.orgId, qrCode.orgId)
      ),
    });

    if (!userMembership) {
      return { success: false, error: "Access Denied: You don't have access to this QR code." };
    }

    if (qrCode.imageUrl && !qrCode.imageUrl.startsWith("data:")) {
      if (!qrCode.imageUrl.startsWith("/")) {
        try {
          const fileKey = getFileKeyFromUrl(qrCode.imageUrl);
          await deleteFile(fileKey);
        } catch (error) {
          logger.warn("Failed to delete remote QR file", error);
        }
      } else if (process.env.NODE_ENV !== "production") {
        try {
          const { unlinkSync } = await import("fs");
          // imageUrl is stored in the database — contain the unlink to /public
          // so a crafted value cannot delete files elsewhere on disk.
          const localPath = resolvePublicPath(qrCode.imageUrl);
          if (localPath && existsSync(localPath)) {
            unlinkSync(localPath);
          }
        } catch (error) {
          logger.warn("Failed to delete local QR file", error);
        }
      }
    }

    await db.delete(qrCodes).where(eq(qrCodes.id, id));
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete QR code";
    return { success: false, error: errorMessage };
  }
}

export async function getQRCodes(orgId: string) {
    if (!orgId) return [];

    const session = await auth();
    if (!session || !session.user) {
      return [];
    }

    if (session.user.role !== "CEO" && session.user.role !== "HR") {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });

      if (!user || (user.role !== "CEO" && user.role !== "HR")) {
        return [];
      }
    }

    const userMembership = await db.query.organizationMembers.findFirst({
      where: (members, { eq: eqFn }) => and(
        eqFn(members.userId, session.user.id),
        eqFn(members.orgId, orgId)
      ),
    });

    if (!userMembership) {
      return [];
    }

    const codes = await db.query.qrCodes.findMany({
        where: eq(qrCodes.orgId, orgId),
        orderBy: (qrCodes, { desc }) => [desc(qrCodes.createdAt)],
    });

    return codes.map(code => ({
      ...code,
      imageUrl: normalizeImageUrl(code.imageUrl),
    }));
}

function normalizeImageUrl(imageUrl: string): string {
  if (!imageUrl || !imageUrl.trim()) {
    return "/placeholder.png";
  }

  const trimmed = imageUrl.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
    return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${trimmed}`;
  }

  if (isStorageConfigured()) {
    return trimmed;
  }

  return `/${trimmed}`;
}

export async function getQRCodeImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl || !imageUrl.trim()) {
    throw new Error("Image URL is required");
  }

  const trimmed = imageUrl.trim();

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL && trimmed.startsWith(process.env.NEXT_PUBLIC_R2_PUBLIC_URL)) {
      const key = trimmed.replace(`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/`, "").replace(/^\/+/, "");
      if (isStorageConfigured() && key) {
        try {
          const signedUrl = await getFileUrl(key, 3600);
          if (signedUrl && (signedUrl.startsWith("http://") || signedUrl.startsWith("https://"))) {
            return signedUrl;
          }
        } catch (error) {
          logger.warn("Failed to get signed URL for R2 key", error);
        }
      }
    }
    return trimmed;
  }

  if (isStorageConfigured()) {
    try {
      const signedUrl = await getFileUrl(trimmed, 3600);
      if (signedUrl && (signedUrl.startsWith("http://") || signedUrl.startsWith("https://"))) {
        return signedUrl;
      }
    } catch (error) {
      logger.warn("Failed to get signed URL", error);
    }

    if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${trimmed.replace(/^\/+/, "")}`;
      if (publicUrl.startsWith("http://") || publicUrl.startsWith("https://")) {
        return publicUrl;
      }
    }

    throw new Error("Unable to generate valid file URL");
  }

  const localPath = `/${trimmed.replace(/^\/+/, "")}`;
  return localPath;
}
