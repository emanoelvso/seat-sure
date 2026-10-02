import "server-only";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { ME } from "@/features/auth/api/me";
import { REFRESH_SESSION } from "@/features/auth/api/refresh-session";
import {
  clearSessionCookies,
  readAccessToken,
  readRefreshToken,
  setSessionCookies,
} from "@/features/auth/api/session-cookies";
import type { MeQuery } from "@/types/__generated__/graphql";

export interface Session {
  user: MeQuery["me"] | null;
}

async function fetchMe(accessToken: string): Promise<Session> {
  const { me } = await graphqlServerFetch(
    ME,
    {},
    { revalidate: 0, accessToken },
  );
  return { user: me };
}

// AUTH-47: an expired/missing access token is refreshed transparently before
// answering. AUTH-48: a refresh the API no longer honors (UNAUTHENTICATED)
// clears both cookies so the browser stops sending them.
async function refreshAndFetchMe(refreshToken: string): Promise<Session> {
  try {
    const { refreshSession } = await graphqlServerFetch(
      REFRESH_SESSION,
      { input: { refreshToken } },
      { revalidate: 0 },
    );
    await setSessionCookies(refreshSession);
    return await fetchMe(refreshSession.accessToken);
  } catch (error) {
    if (error instanceof GraphQLRequestError && error.code === "UNAUTHENTICATED") {
      await clearSessionCookies();
    }
    return { user: null };
  }
}

export async function getSession(): Promise<Session> {
  const accessToken = await readAccessToken();

  if (accessToken) {
    try {
      return await fetchMe(accessToken);
    } catch (error) {
      if (!(error instanceof GraphQLRequestError && error.code === "UNAUTHENTICATED")) {
        return { user: null };
      }
      // Access token rejected: fall through to the refresh path below.
    }
  }

  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    return { user: null };
  }

  return refreshAndFetchMe(refreshToken);
}
