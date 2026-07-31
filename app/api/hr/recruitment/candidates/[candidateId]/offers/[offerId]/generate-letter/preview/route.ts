import { type NextRequest, NextResponse } from "next/server";
import { withAuth, err } from "@/lib/api/helpers";
import {
  offerLetterPreviewPdfHeaders,
  renderOfferLetterPdfForOffer,
} from "@/lib/hr/render-offer-letter-for-offer";

type RouteParams = {
  params: Promise<{ candidateId: string; offerId: string }>;
};

const HR_ROLES = ["CEO", "ADMIN", "HR", "BRANCH_HR"];

export async function GET(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: cid, offerId: oid } = await params;
    const candidateId = Number(cid);
    const offerId = Number(oid);
    const templateId = Number(req.nextUrl.searchParams.get("templateId"));

    if (!Number.isFinite(candidateId) || !Number.isFinite(offerId)) {
      return err("Invalid ID", 400);
    }
    if (!Number.isFinite(templateId) || templateId <= 0) {
      return err("templateId is required", 400);
    }

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    try {
      const pdfBuffer = await renderOfferLetterPdfForOffer({
        orgId: session.orgId,
        candidateId,
        offerId,
        templateId,
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: offerLetterPreviewPdfHeaders(offerId),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Preview failed";
      if (message === "Candidate not found") return err(message, 404);
      if (message === "Offer not found") return err(message, 404);
      if (message === "Template not found") return err(message, 404);
      if (message === "Organisation not found") return err(message, 404);
      return err(message, 500);
    }
  });
}
