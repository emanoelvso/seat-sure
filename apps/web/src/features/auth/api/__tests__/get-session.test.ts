import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { ME } from "@/features/auth/api/me";
import { REFRESH_SESSION } from "@/features/auth/api/refresh-session";
import {
  clearSessionCookies,
  readAccessToken,
  readRefreshToken,
  setSessionCookies,
} from "@/features/auth/api/session-cookies";
import { getSession } from "@/features/auth/api/get-session";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  );
  return { ...actual, graphqlServerFetch: vi.fn() };
});
vi.mock("@/features/auth/api/session-cookies");

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedReadAccessToken = vi.mocked(readAccessToken);
const mockedReadRefreshToken = vi.mocked(readRefreshToken);
const mockedSetSessionCookies = vi.mocked(setSessionCookies);
const mockedClearSessionCookies = vi.mocked(clearSessionCookies);

const user = {
  id: "user-1",
  email: "a@example.com",
  firstName: "Nadia",
  lastName: "Kahn",
  avatarUrl: null,
};

const refreshedSession = {
  accessToken: "new-access-token",
  refreshToken: "new-refresh-token",
  expiresAt: new Date(Date.now() + 1000).toISOString(),
  persistent: true,
};

describe("getSession", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedReadAccessToken.mockReset();
    mockedReadRefreshToken.mockReset();
    mockedSetSessionCookies.mockReset().mockResolvedValue(undefined);
    mockedClearSessionCookies.mockReset().mockResolvedValue(undefined);
  });

  it("answers from a valid access token without calling refreshSession", async () => {
    mockedReadAccessToken.mockResolvedValue("valid-access-token");
    mockedReadRefreshToken.mockResolvedValue("some-refresh-token");
    mockedFetch.mockResolvedValueOnce({ me: user });

    const result = await getSession();

    expect(result).toEqual({ user });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      ME,
      {},
      { revalidate: 0, accessToken: "valid-access-token" },
    );
    expect(mockedFetch).not.toHaveBeenCalledWith(
      REFRESH_SESSION,
      expect.anything(),
      expect.anything(),
    );
  });

  it("refreshes an expired access token and returns the user (AUTH-47)", async () => {
    mockedReadAccessToken.mockResolvedValue("expired-access-token");
    mockedReadRefreshToken.mockResolvedValue("refresh-token-1");
    mockedFetch
      .mockRejectedValueOnce(
        new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED"),
      )
      .mockResolvedValueOnce({ refreshSession: refreshedSession })
      .mockResolvedValueOnce({ me: user });

    const result = await getSession();

    expect(result).toEqual({ user });
    expect(mockedFetch).toHaveBeenNthCalledWith(
      2,
      REFRESH_SESSION,
      { input: { refreshToken: "refresh-token-1" } },
      { revalidate: 0 },
    );
    expect(mockedSetSessionCookies).toHaveBeenCalledWith(refreshedSession);
    expect(mockedFetch).toHaveBeenNthCalledWith(
      3,
      ME,
      {},
      { revalidate: 0, accessToken: "new-access-token" },
    );
    expect(mockedClearSessionCookies).not.toHaveBeenCalled();
  });

  it("passes a null refreshToken from refreshSession through to setSessionCookies", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue("refresh-token-2");
    const singleUseSession = { ...refreshedSession, refreshToken: null };
    mockedFetch
      .mockResolvedValueOnce({ refreshSession: singleUseSession })
      .mockResolvedValueOnce({ me: user });

    const result = await getSession();

    expect(result).toEqual({ user });
    expect(mockedSetSessionCookies).toHaveBeenCalledWith(singleUseSession);
  });

  it("clears both cookies when refreshSession answers UNAUTHENTICATED (AUTH-48)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue("stale-refresh-token");
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED"),
    );

    const result = await getSession();

    expect(result).toEqual({ user: null });
    expect(mockedClearSessionCookies).toHaveBeenCalledTimes(1);
  });

  it("answers { user: null } without any API call when there are no cookies", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue(undefined);

    const result = await getSession();

    expect(result).toEqual({ user: null });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("answers { user: null } and keeps cookies on a network error", async () => {
    mockedReadAccessToken.mockResolvedValue("valid-access-token");
    mockedReadRefreshToken.mockResolvedValue("some-refresh-token");
    mockedFetch.mockRejectedValueOnce(new Error("fetch failed"));

    const result = await getSession();

    expect(result).toEqual({ user: null });
    expect(mockedClearSessionCookies).not.toHaveBeenCalled();
  });

  it("uses revalidate: 0 on every call", async () => {
    mockedReadAccessToken.mockResolvedValue("expired-access-token");
    mockedReadRefreshToken.mockResolvedValue("refresh-token-1");
    mockedFetch
      .mockRejectedValueOnce(
        new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED"),
      )
      .mockResolvedValueOnce({ refreshSession: refreshedSession })
      .mockResolvedValueOnce({ me: user });

    await getSession();

    for (const call of mockedFetch.mock.calls) {
      expect(call[2]).toMatchObject({ revalidate: 0 });
    }
  });
});
