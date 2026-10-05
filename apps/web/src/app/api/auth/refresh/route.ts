import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/api/get-session";
import { safeRedirect } from "@/features/auth/utils/safe-redirect";
import { paths } from "@/config/paths";

// A protected Server Component page redirects here when its access cookie
// is missing or rejected (AD-024): refreshes the session, writes the
// cookies, then sends the browser back to redirectTo (signed in) or to
// /login (signed out). Never cached: the outcome depends on the request's
// cookies.
export async function GET(request: Request): Promise<NextResponse> {
  const redirectTo = new URL(request.url).searchParams.get("redirectTo");
  const session = await getSession();

  const target = session.user
    ? safeRedirect(redirectTo)
    : paths.login.getHref(redirectTo ?? undefined);

  return NextResponse.redirect(new URL(target, request.url), {
    status: 307,
    headers: { "Cache-Control": "no-store" },
  });
}
