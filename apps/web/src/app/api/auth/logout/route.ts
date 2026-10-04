import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/features/auth/api/session-cookies";
import { paths } from "@/config/paths";

// Clears the session cookies and sends the browser home. A plain Route
// Handler, not a Server Action import, so the shared header can trigger it
// with a native form post instead of crossing the shared -> feature
// boundary (see GET /api/auth/session for the same pattern).
export async function POST(request: Request): Promise<NextResponse> {
  await clearSessionCookies();
  return NextResponse.redirect(new URL(paths.home.getHref(), request.url), {
    status: 303,
  });
}
