import type { NextRequest } from "next/server";
import { handlers } from "../../../../lib/auth";

/** Session and CSRF JSON is per-user; never let a shared cache keep it (R3-NET-02). */
function noStore(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    const res = await handler(req);
    if (res.headers.get("content-type")?.includes("application/json")) {
      res.headers.set("Cache-Control", "private, no-store");
    }
    return res;
  };
}

export const GET = noStore(handlers.GET);
export const POST = noStore(handlers.POST);
