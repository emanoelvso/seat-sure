import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  readAccessToken,
  readRefreshToken,
} from "@/features/auth/api/session-cookies";
import { MY_NOTIFICATIONS } from "@/features/account/api/find-my-notifications";
import { getNotificationsPageData } from "@/features/account/api/get-notifications-page-data";

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
vi.mock("@/lib/graphql-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  );
  return { ...actual, graphqlServerFetch: vi.fn() };
});

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedReadAccessToken = vi.mocked(readAccessToken);
const mockedReadRefreshToken = vi.mocked(readRefreshToken);

const PATH = "/account/notifications";

const myNotifications = {
  __typename: "NotificationsPage" as const,
  items: [],
  counts: {
    __typename: "NotificationCounts" as const,
    all: 0,
    unread: 0,
    read: 0,
  },
  page: 1,
  totalPages: 0,
};

describe("getNotificationsPageData", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedReadAccessToken.mockReset();
    mockedReadRefreshToken.mockReset();
    vi.mocked(redirect).mockClear();
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    mockedFetch.mockResolvedValue({ myNotifications } as never);
  });

  it.each([
    ["all", "ALL"],
    ["unread", "UNREAD"],
    ["read", "READ"],
  ] as const)(
    "maps tab=%s to %s with page size 10 (View AC 5, 7)",
    async (tab, apiTab) => {
      await getNotificationsPageData({ tab, page: 1 }, PATH);

      expect(mockedFetch).toHaveBeenCalledWith(
        MY_NOTIFICATIONS,
        { input: { tab: apiTab, page: 1, pageSize: 10 } },
        { revalidate: 0, accessToken: "access-token-1" },
      );
    },
  );

  it("sends the requested page and returns myNotifications", async () => {
    const result = await getNotificationsPageData(
      { tab: "unread", page: 3 },
      PATH,
    );

    expect(result).toEqual(myNotifications);
    expect(mockedFetch.mock.calls[0][1]).toEqual({
      input: { tab: "UNREAD", page: 3, pageSize: 10 },
    });
  });

  it("redirects to login with the current path when there is no session (View AC 18)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue(undefined);

    await expect(
      getNotificationsPageData({ tab: "all", page: 1 }, PATH),
    ).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fnotifications",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("rethrows an error other than UNAUTHENTICATED for the route error boundary (View AC 20)", async () => {
    const failure = new GraphQLRequestError("Boom", "INTERNAL_SERVER_ERROR");
    mockedFetch.mockRejectedValue(failure);

    await expect(
      getNotificationsPageData({ tab: "all", page: 1 }, PATH),
    ).rejects.toBe(failure);
    expect(redirect).not.toHaveBeenCalled();
  });
});
