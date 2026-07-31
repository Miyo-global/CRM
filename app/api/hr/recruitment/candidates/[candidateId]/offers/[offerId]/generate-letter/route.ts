import { type NextRequest, NextResponse } from "next/server";
import { withAuth, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isStorageConfigured, uploadFile } from "@/lib/storage";
import {
  offerLetterPreviewPdfHeaders,
  renderOfferLetterPdfForOffer,
} from "@/lib/hr/render-offer-letter-for-offer";

type RouteParams = {
  params: Promise<{ candidateId: string; offerId: string }>;
};

const HR_ROLES = ["CEO", "ADMIN", "HR", "BRANCH_HR"];

const bodySchema = z.object({
  templateId: z.number().int().positive(),
  preview: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: cid, offerId: oid } = await params;
    const candidateId = Number(cid);
    const offerId = Number(oid);

    if (!Number.isFinite(candidateId) || !Number.isFinite(offerId)) {
      return err("Invalid ID", 400);
    }

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    const input = bodySchema.parse(await req.json());

    try {
      const pdfBuffer = await renderOfferLetterPdfForOffer({
        orgId: session.orgId,
        candidateId,
        offerId,
        templateId: input.templateId,
      });

      if (input.preview) {
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: offerLetterPreviewPdfHeaders(offerId),
        });
      }

      if (!isStorageConfigured()) {
        return err("Storage not configured", 503);
      }

      const ts = Date.now();
      const { key } = await uploadFile(
        pdfBuffer,
        "offer-letters",
        `offer-letter-${offerId}-${ts}.pdf`,
        "application/pdf",
        session.orgId,
      );

      await db
        .update(candidateOffers)
        .set({ offerLetterUrl: key, updatedAt: new Date() })
        .where(eq(candidateOffers.id, offerId));

      const downloadUrl = `/api/storage/download?key=${encodeURIComponent(key)}&attachment=1`;
      return NextResponse.json({ url: downloadUrl, key }, { status: 200 });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Generation failed";
      if (message === "Candidate not found") return err(message, 404);
      if (message === "Offer not found") return err(message, 404);
      if (message === "Template not found") return err(message, 404);
      if (message === "Organisation not found") return err(message, 404);
      return err(message, 500);
    }
  });
}
