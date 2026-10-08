import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { MARK_ALL_NOTIFICATIONS_READ } from "@/features/account/api/mark-all-notifications-read";
import { MARK_NOTIFICATION_READ } from "@/features/account/api/mark-notification-read";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/account/api/notification-actions";

const { REDIRECT_ERROR } = vi.hoisted(() => ({
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("@/lib/graphql-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  );
  return { ...actual, graphqlServerFetch: vi.fn() };
});
vi.mock("@/features/auth/api/with-access-token", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/auth/api/with-access-token")
  >("@/features/auth/api/with-access-token");
  return { ...actual, withAccessToken: vi.fn() };
});

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedWithAccessToken = vi.mocked(withAccessToken);

const GENERIC = "Something went wrong. Please try again.";
const OPTIONS = { revalidate: 0, accessToken: "access-token-1" };
const counts = {
  __typename: "NotificationCounts" as const,
  all: 5,
  unread: 0,
  read: 5,
};

beforeEach(() => {
  mockedFetch.mockReset();
  mockedWithAccessToken.mockReset();
  vi.mocked(redirect).mockClear();
  mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
});

describe("markNotificationReadAction", () => {
  it("sends the id with the token and revalidate: 0 and answers ok (Read AC 4)", async () => {
    mockedFetch.mockResolvedValue({
      markNotificationRead: { id: "n-1", readAt: "2026-10-07T10:00:00Z" },
    } as never);

    const result = await markNotificationReadAction("n-1");

    expect(result).toEqual({ ok: true });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      MARK_NOTIFICATION_READ,
      { input: { id: "n-1" } },
      OPTIONS,
    );
  });

  it.each([
    [
      "NOTIFICATION_NOT_FOUND",
      new GraphQLRequestError("Gone", undefined, "NOTIFICATION_NOT_FOUND"),
    ],
    ["a network error", new Error("fetch failed")],
  ])("returns the generic error for %s (Read AC 7)", async (_, error) => {
    mockedFetch.mockRejectedValue(error);

    expect(await markNotificationReadAction("n-1")).toEqual({
      error: GENERIC,
    });
  });

  it("redirects to login with /account/notifications when the session can't be refreshed", async () => {
    mockedWithAccessToken.mockResolvedValue(NO_SESSION);

    await expect(markNotificationReadAction("n-1")).rejects.toBe(
      REDIRECT_ERROR,
    );

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fnotifications",
    );
  });
});

describe("markAllNotificationsReadAction", () => {
  it("sends the mutation with the token and revalidate: 0 and returns the counts (Mark all AC 4)", async () => {
    mockedFetch.mockResolvedValue({
      markAllNotificationsRead: counts,
    } as never);

    const result = await markAllNotificationsReadAction();

    expect(result).toEqual({ counts });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      MARK_ALL_NOTIFICATIONS_READ,
      {},
      OPTIONS,
    );
  });

  it("returns the generic error on any failure (Mark all AC 5)", async () => {
    mockedFetch.mockRejectedValue(new Error("fetch failed"));

    expect(await markAllNotificationsReadAction()).toEqual({ error: GENERIC });
  });

  it("redirects to login with /account/notifications when the session can't be refreshed", async () => {
    mockedWithAccessToken.mockResolvedValue(NO_SESSION);

    await expect(markAllNotificationsReadAction()).rejects.toBe(
      REDIRECT_ERROR,
    );

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fnotifications",
    );
  });
});
