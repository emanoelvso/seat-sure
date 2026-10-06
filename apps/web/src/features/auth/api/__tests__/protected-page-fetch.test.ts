import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError } from "@/lib/graphql-server";
import {
  readAccessToken,
  readRefreshToken,
} from "@/features/auth/api/session-cookies";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";

const { REDIRECT_ERROR } = vi.hoisted(() => ({
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("@/features/auth/api/session-cookies");

const mockedReadAccessToken = vi.mocked(readAccessToken);
const mockedReadRefreshToken = vi.mocked(readRefreshToken);

const CURRENT_PATH = "/account/tickets";

async function expectRedirectTo(target: string, call: () => Promise<unknown>) {
  await expect(call()).rejects.toBe(REDIRECT_ERROR);
  expect(redirect).toHaveBeenCalledWith(target);
}

describe("protectedPageFetch", () => {
  beforeEach(() => {
    mockedReadAccessToken.mockReset();
    mockedReadRefreshToken.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("returns the value of fn, called with the access token (ACCT-03)", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    const fn = vi.fn().mockResolvedValue({ orders: 3 });

    const result = await protectedPageFetch(CURRENT_PATH, fn);

    expect(result).toEqual({ orders: 3 });
    expect(fn).toHaveBeenCalledWith("access-token-1");
  });

  it("redirects to the refresh route when the token is missing but a refresh cookie exists (ACCT-03)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue("refresh-token-1");
    const fn = vi.fn();

    await expectRedirectTo(
      "/api/auth/refresh?redirectTo=%2Faccount%2Ftickets",
      () => protectedPageFetch(CURRENT_PATH, fn),
    );
    expect(fn).not.toHaveBeenCalled();
  });

  it("redirects to /login when there is no token and no refresh cookie (ACCT-03)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue(undefined);
    const fn = vi.fn();

    await expectRedirectTo("/login?redirectTo=%2Faccount%2Ftickets", () =>
      protectedPageFetch(CURRENT_PATH, fn),
    );
    expect(fn).not.toHaveBeenCalled();
  });

  it("redirects to the refresh route when fn throws UNAUTHENTICATED (ACCT-03)", async () => {
    mockedReadAccessToken.mockResolvedValue("rejected-access-token");
    const fn = vi
      .fn()
      .mockRejectedValue(
        new GraphQLRequestError("Unauthenticated", "UNAUTHENTICATED"),
      );

    await expectRedirectTo(
      "/api/auth/refresh?redirectTo=%2Faccount%2Ftickets",
      () => protectedPageFetch(CURRENT_PATH, fn),
    );
  });

  it("rethrows any other error (ACCT-03)", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    const boom = new Error("boom");
    const fn = vi.fn().mockRejectedValue(boom);

    await expect(protectedPageFetch(CURRENT_PATH, fn)).rejects.toBe(boom);
    expect(redirect).not.toHaveBeenCalled();
  });
});
