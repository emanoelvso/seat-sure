import "server-only";
import { redirect } from "next/navigation";
import { GraphQLRequestError } from "@/lib/graphql-server";
import {
  readAccessToken,
  readRefreshToken,
} from "@/features/auth/api/session-cookies";
import { paths } from "@/config/paths";

// The data-loading rule of a protected Server Component page (AD-024).
// Missing access token: a refresh cookie sends the browser through the
// refresh route first, otherwise straight to /login. A rejected access token
// (UNAUTHENTICATED) is also sent through the refresh route - Server
// Components can't write cookies themselves. Any other error is rethrown.
export async function protectedPageFetch<T>(
  currentPath: string,
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  const accessToken = await readAccessToken();

  if (!accessToken) {
    const refreshToken = await readRefreshToken();
    redirect(
      refreshToken
        ? paths.sessionRefresh.getHref(currentPath)
        : paths.login.getHref(currentPath),
    );
  }

  try {
    return await fn(accessToken);
  } catch (error) {
    if (
      error instanceof GraphQLRequestError &&
      error.code === "UNAUTHENTICATED"
    ) {
      redirect(paths.sessionRefresh.getHref(currentPath));
    }
    throw error;
  }
}
