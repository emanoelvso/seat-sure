import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { withAccessToken } from "@/features/auth/api/with-access-token";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { MY_NOTIFICATIONS } from "@/features/account/api/find-my-notifications";

vi.mock("@/features/auth/api/with-access-token", () => ({
  NO_SESSION: "NO_SESSION",
  withAccessToken: vi.fn(),
}));
vi.mock("@/lib/graphql-server", () => ({ graphqlServerFetch: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(withAccessToken).mockImplementation((run) => run("access-token"));
});

describe("GET /api/notifications/unread-count", () => {
  it("returns only the authenticated user's unread count without caching", async () => {
    vi.mocked(graphqlServerFetch).mockResolvedValue({ myNotifications: { counts: { unread: 7 }, items: [{ id: "private" }] } });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ unread: 7 });
    expect(graphqlServerFetch).toHaveBeenCalledWith(MY_NOTIFICATIONS, { input: { tab: "UNREAD", page: 1, pageSize: 1 } }, { accessToken: "access-token", revalidate: 0 });
  });

  it("returns 401 without fetching notifications when signed out", async () => {
    vi.mocked(withAccessToken).mockResolvedValue("NO_SESSION");
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Unauthenticated" });
    expect(graphqlServerFetch).not.toHaveBeenCalled();
  });

  it("returns a generic uncached error when the API fails", async () => {
    vi.mocked(graphqlServerFetch).mockRejectedValue(new Error("private details"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Unavailable" });
  });
});
