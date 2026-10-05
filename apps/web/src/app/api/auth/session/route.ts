import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/api/get-session";

// Answers the signed-in state for the client header (AUTH-48). Never
// cached: the session can change between requests from the same browser.
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  return NextResponse.json(session, {
    headers: { "Cache-Control": "no-store" },
  });
}
