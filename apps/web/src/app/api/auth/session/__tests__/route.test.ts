import { describe, expect, it, vi } from "vitest";
import { getSession } from "@/features/auth/api/get-session";
import { GET } from "@/app/api/auth/session/route";

vi.mock("@/features/auth/api/get-session", () => ({ getSession: vi.fn() }));

const mockedGetSession = vi.mocked(getSession);

describe("GET /api/auth/session", () => {
  it("answers the session as JSON with Cache-Control: no-store", async () => {
    const session = {
      user: {
        __typename: "CurrentUser" as const,
        id: "user-1",
        email: "a@example.com",
        firstName: "Nadia",
        lastName: "Kahn",
        avatarUrl: null,
      },
    };
    mockedGetSession.mockResolvedValue(session);

    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(session);
  });
});
