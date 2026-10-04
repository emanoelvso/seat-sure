import { describe, expect, it, vi } from "vitest";
import { getSession } from "@/features/auth/api/get-session";
import { GET } from "@/app/api/auth/refresh/route";

vi.mock("@/features/auth/api/get-session", () => ({ getSession: vi.fn() }));

const mockedGetSession = vi.mocked(getSession);

const signedInUser = {
  __typename: "CurrentUser" as const,
  id: "user-1",
  email: "a@example.com",
  firstName: "Nadia",
  lastName: "Kahn",
  avatarUrl: null,
};

describe("GET /api/auth/refresh", () => {
  it("redirects to redirectTo when the session is signed in", async () => {
    mockedGetSession.mockResolvedValue({ user: signedInUser });
    const request = new Request(
      "https://app.example.com/api/auth/refresh?redirectTo=%2Fcheckout%2Fabc",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "https://app.example.com/checkout/abc",
    );
  });

  it("redirects to /login?redirectTo=... when signed out (PAY-03)", async () => {
    mockedGetSession.mockResolvedValue({ user: null });
    const request = new Request(
      "https://app.example.com/api/auth/refresh?redirectTo=%2Fcheckout%2Fabc",
    );

    const response = await GET(request);

    expect(response.headers.get("Location")).toBe(
      "https://app.example.com/login?redirectTo=%2Fcheckout%2Fabc",
    );
  });

  it("falls back to / for an unsafe redirectTo while signed in", async () => {
    mockedGetSession.mockResolvedValue({ user: signedInUser });
    const request = new Request(
      "https://app.example.com/api/auth/refresh?redirectTo=//evil.com",
    );

    const response = await GET(request);

    expect(response.headers.get("Location")).toBe("https://app.example.com/");
  });

  it("answers with Cache-Control: no-store", async () => {
    mockedGetSession.mockResolvedValue({ user: null });
    const request = new Request(
      "https://app.example.com/api/auth/refresh?redirectTo=%2Fcheckout%2Fabc",
    );

    const response = await GET(request);

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
