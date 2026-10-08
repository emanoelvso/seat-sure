import { NextResponse } from "next/server";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";
import { MY_NOTIFICATIONS } from "@/features/account/api/find-my-notifications";
import { graphqlServerFetch } from "@/lib/graphql-server";

const headers = { "Cache-Control": "no-store" };

export async function GET(): Promise<NextResponse> {
  try {
    const unread = await withAccessToken(async (accessToken) => {
      const { myNotifications } = await graphqlServerFetch(
        MY_NOTIFICATIONS,
        { input: { tab: "UNREAD", page: 1, pageSize: 1 } },
        { accessToken, revalidate: 0 },
      );
      return myNotifications.counts.unread;
    });
    if (unread === NO_SESSION) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401, headers });
    }
    return NextResponse.json({ unread }, { headers });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
  }
}
