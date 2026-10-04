import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { REFRESH_SESSION } from "@/features/auth/api/refresh-session";
import {
  clearSessionCookies,
  readAccessToken,
  readRefreshToken,
  setSessionCookies,
} from "@/features/auth/api/session-cookies";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";

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

const refreshedSession = {
  accessToken: "new-access-token",
  refreshToken: "new-refresh-token",
  expiresAt: new Date(Date.now() + 1000).toISOString(),
  persistent: true,
};

describe("withAccessToken", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedReadAccessToken.mockReset();
    mockedReadRefreshToken.mockReset();
    mockedSetSessionCookies.mockReset().mockResolvedValue(undefined);
    mockedClearSessionCookies.mockReset().mockResolvedValue(undefined);
  });

  it("calls fn once with a valid access token (PAY-03)", async () => {
    mockedReadAccessToken.mockResolvedValue("valid-access-token");
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withAccessToken(fn);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("valid-access-token");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("refreshes an expired access token, writes the new cookies and retries fn with it (PAY-12)", async () => {
    mockedReadAccessToken.mockResolvedValue("expired-access-token");
    mockedReadRefreshToken.mockResolvedValue("refresh-token-1");
    mockedFetch.mockResolvedValueOnce({ refreshSession: refreshedSession });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED"),
      )
      .mockResolvedValueOnce("ok-after-refresh");

    const result = await withAccessToken(fn);

    expect(result).toBe("ok-after-refresh");
    expect(mockedFetch).toHaveBeenCalledWith(
      REFRESH_SESSION,
      { input: { refreshToken: "refresh-token-1" } },
      { revalidate: 0 },
    );
    expect(mockedSetSessionCookies).toHaveBeenCalledWith(refreshedSession);
    expect(fn).toHaveBeenNthCalledWith(2, "new-access-token");
  });

  it("answers NO_SESSION without calling the API when there's no refresh cookie", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue(undefined);
    const fn = vi.fn();

    const result = await withAccessToken(fn);

    expect(result).toBe(NO_SESSION);
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(fn).not.toHaveBeenCalled();
  });

  it("clears the cookies and answers NO_SESSION when the refresh is rejected", async () => {
    mockedReadAccessToken.mockResolvedValue("expired-access-token");
    mockedReadRefreshToken.mockResolvedValue("stale-refresh-token");
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED"),
    );
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED"),
      );

    const result = await withAccessToken(fn);

    expect(result).toBe(NO_SESSION);
    expect(mockedClearSessionCookies).toHaveBeenCalledTimes(1);
  });

  it("rethrows a non-auth error from fn without attempting a refresh", async () => {
    mockedReadAccessToken.mockResolvedValue("valid-access-token");
    const boom = new Error("boom");
    const fn = vi.fn().mockRejectedValue(boom);

    await expect(withAccessToken(fn)).rejects.toBe(boom);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
