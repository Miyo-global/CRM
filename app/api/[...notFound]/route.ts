import { NextResponse } from "next/server";
import { errorCode } from "@/lib/api/error-code";

// Unknown /api/* paths answered with the HTML 404 page; API clients get the
// JSON envelope instead (QA P2 api-error-envelope).
function notFound() {
  return NextResponse.json({ error: "Not found", code: errorCode(404) }, { status: 404 });
}

export {
  notFound as GET,
  notFound as POST,
  notFound as PUT,
  notFound as PATCH,
  notFound as DELETE,
  notFound as HEAD,
  notFound as OPTIONS,
};
