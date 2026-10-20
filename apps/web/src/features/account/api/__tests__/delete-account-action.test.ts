import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { clearSessionCookies } from "@/features/auth/api/session-cookies";
import { DELETE_MY_ACCOUNT } from "@/features/account/api/delete-my-account";
import { deleteAccountAction } from "@/features/account/api/delete-account-action";

const { REDIRECT } = vi.hoisted(() => ({
  REDIRECT: new Error("NEXT_REDIRECT"),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT;
  }),
}));
vi.mock("@/lib/graphql-server", async () => ({
  ...(await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  )),
  graphqlServerFetch: vi.fn(),
}));
vi.mock("@/features/auth/api/with-access-token", async () => ({
  ...(await vi.importActual<
    typeof import("@/features/auth/api/with-access-token")
  >("@/features/auth/api/with-access-token")),
  withAccessToken: vi.fn(),
}));
vi.mock("@/features/auth/api/session-cookies", () => ({
  clearSessionCookies: vi.fn(),
}));

const ACTIVE_ORDERS_MESSAGE =
  "You can't delete your account while you have an order in progress or tickets for an upcoming event.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

describe("deleteAccountAction (WEB-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(withAccessToken).mockImplementation((fn) => fn("access"));
    vi.mocked(graphqlServerFetch).mockResolvedValue({ deleteMyAccount: true });
  });

  it("sends the typed confirmation with the session's access token", async () => {
    await expect(deleteAccountAction("DELETE")).rejects.toBe(REDIRECT);
    expect(graphqlServerFetch).toHaveBeenCalledWith(
      DELETE_MY_ACCOUNT,
      { input: { confirmation: "DELETE" } },
      { revalidate: 0, accessToken: "access" },
    );
  });

  it("clears the session cookies, then redirects home with the notice flag", async () => {
    await expect(deleteAccountAction("DELETE")).rejects.toBe(REDIRECT);
    expect(clearSessionCookies).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/?accountDeleted=1");
    expect(vi.mocked(clearSessionCookies).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(redirect).mock.invocationCallOrder[0],
    );
  });

  it("answers the active-orders message and keeps the cookies", async () => {
    vi.mocked(graphqlServerFetch).mockRejectedValue(
      new GraphQLRequestError(
        "blocked",
        "BAD_USER_INPUT",
        "ACCOUNT_HAS_ACTIVE_ORDERS",
      ),
    );
    expect(await deleteAccountAction("DELETE")).toEqual({
      error: ACTIVE_ORDERS_MESSAGE,
    });
    expect(clearSessionCookies).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    new GraphQLRequestError("nope", "BAD_USER_INPUT", "DELETION_NOT_CONFIRMED"),
    new GraphQLRequestError("boom", "INTERNAL_SERVER_ERROR"),
    new Error("Network unavailable"),
  ])("answers the generic error for any other failure (%s)", async (error) => {
    vi.mocked(graphqlServerFetch).mockRejectedValue(error);
    expect(await deleteAccountAction("DELETE")).toEqual({
      error: GENERIC_ERROR,
    });
    expect(clearSessionCookies).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("answers the generic error when the session refresh fails", async () => {
    vi.mocked(withAccessToken).mockRejectedValue(new Error("Refresh down"));
    expect(await deleteAccountAction("DELETE")).toEqual({
      error: GENERIC_ERROR,
    });
    expect(clearSessionCookies).not.toHaveBeenCalled();
  });

  it("redirects to login with the settings page as next when there is no session", async () => {
    vi.mocked(withAccessToken).mockResolvedValue(NO_SESSION);
    await expect(deleteAccountAction("DELETE")).rejects.toBe(REDIRECT);
    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fsettings",
    );
    expect(clearSessionCookies).not.toHaveBeenCalled();
  });
});
