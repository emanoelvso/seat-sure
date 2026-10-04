import "server-only";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { REFRESH_SESSION } from "@/features/auth/api/refresh-session";
import {
  clearSessionCookies,
  readAccessToken,
  readRefreshToken,
  setSessionCookies,
} from "@/features/auth/api/session-cookies";

// Sentinel returned instead of throwing: Server Actions turn it into a
// redirect to /login rather than a thrown error (PAY-03).
export const NO_SESSION = "NO_SESSION";

// Runs fn with a valid access token for Server Actions calling protected
// GraphQL operations (AD-024). A missing or rejected (UNAUTHENTICATED)
// access token triggers a single refresh-and-retry with the refresh cookie.
// A refresh that's impossible (no refresh cookie) or itself rejected clears
// the cookies and answers NO_SESSION instead of throwing. Any other error
// from fn is rethrown as-is.
export async function withAccessToken<T>(
  fn: (accessToken: string) => Promise<T>,
): Promise<T | typeof NO_SESSION> {
  const accessToken = await readAccessToken();

  if (accessToken) {
    try {
      return await fn(accessToken);
    } catch (error) {
      if (
        !(error instanceof GraphQLRequestError && error.code === "UNAUTHENTICATED")
      ) {
        throw error;
      }
      // Access token rejected: fall through to the refresh path below.
    }
  }

  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    return NO_SESSION;
  }

  let refreshed;
  try {
    ({ refreshSession: refreshed } = await graphqlServerFetch(
      REFRESH_SESSION,
      { input: { refreshToken } },
      { revalidate: 0 },
    ));
  } catch (error) {
    if (error instanceof GraphQLRequestError && error.code === "UNAUTHENTICATED") {
      await clearSessionCookies();
      return NO_SESSION;
    }
    throw error;
  }

  await setSessionCookies(refreshed);
  return fn(refreshed.accessToken);
}
