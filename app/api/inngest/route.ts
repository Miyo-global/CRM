import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { inngestFunctions } from "@/lib/inngest/functions";

/**
 * SEC-0015: without a signing key the serve handler cannot authenticate
 * introspection, and every unsigned call came back as a 500. Inngest is not
 * wired up on production (MIYO-0092) — the scheduled work runs from the
 * vercel.json cron routes — so the endpoint answers 405 until a key is set
 * rather than leaking an internal error.
 */
const handlers = process.env.INNGEST_SIGNING_KEY
  ? serve({ client: inngest, functions: inngestFunctions })
  : null;

const notConfigured = () =>
  new Response("Inngest is not configured on this deployment.", {
    status: 405,
    headers: { "content-type": "text/plain; charset=utf-8", allow: "" },
  });

export const GET = handlers?.GET ?? notConfigured;
export const POST = handlers?.POST ?? notConfigured;
export const PUT = handlers?.PUT ?? notConfigured;
