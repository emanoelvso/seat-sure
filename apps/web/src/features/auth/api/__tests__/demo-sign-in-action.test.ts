import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { DEMO_SIGN_IN } from "@/features/auth/api/demo-sign-in";
import { demoSignInAction } from "@/features/auth/api/demo-sign-in-action";

const { written, REDIRECT_ERROR } = vi.hoisted(() => ({
  written: new Map<string, { value: string; options: Record<string, unknown> }>(),
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw REDIRECT_ERROR; }) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set(name: string, value: string, options: Record<string, unknown>) {
      written.set(name, { value, options });
    },
  }),
}));
vi.mock("@/lib/graphql-server", async () => ({
  ...await vi.importActual<typeof import("@/lib/graphql-server")>("@/lib/graphql-server"),
  graphqlServerFetch: vi.fn(),
}));
const fetchMock = vi.mocked(graphqlServerFetch);
const session = { accessToken: "demo-access", refreshToken: "demo-refresh", persistent: false, expiresAt: "2026-11-01T00:00:00.000Z" };
const errorState = { formError: "Demo sign-in is unavailable. Please try again." };
const form = (path?: string) => { const data = new FormData(); if (path) data.set("redirectTo", path); return data; };

// Exercise the real session-cookie writer against an in-memory cookie store.
describe("demoSignInAction", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "true"); vi.stubEnv("NODE_ENV", "production");
    written.clear(); fetchMock.mockReset(); vi.mocked(redirect).mockClear();
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("requests an uncached anonymous demo session and writes only httpOnly session cookies", async () => {
    fetchMock.mockResolvedValue({ demoSignIn: session });
    await expect(demoSignInAction({}, form("/events?type=concert"))).rejects.toBe(REDIRECT_ERROR);
    expect(fetchMock).toHaveBeenCalledWith(DEMO_SIGN_IN, {}, { revalidate: 0 });
    expect([...written]).toEqual([
      ["ss_access", { value: "demo-access", options: { httpOnly: true, sameSite: "lax", path: "/", secure: true } }],
      ["ss_refresh", { value: "demo-refresh", options: { httpOnly: true, sameSite: "lax", path: "/", secure: true } }],
    ]);
    expect(redirect).toHaveBeenCalledWith("/events?type=concert");
  });
  it.each(["https://outside.invalid", "//outside.invalid", "/\\outside.invalid"])("safely redirects unsafe return path %s to home", async (path) => {
    fetchMock.mockResolvedValue({ demoSignIn: session });
    await expect(demoSignInAction({}, form(path))).rejects.toBe(REDIRECT_ERROR);
    expect(redirect).toHaveBeenCalledWith("/");
  });
  it.each(["false", ""])("independently refuses disabled or missing server demo flag (%s)", async (flag) => {
    vi.stubEnv("DEMO_MODE", flag);
    expect(await demoSignInAction({}, form())).toEqual(errorState);
    expect(fetchMock).not.toHaveBeenCalled(); expect([...written]).toEqual([]); expect(redirect).not.toHaveBeenCalled();
  });
  it("returns a retryable generic error for backend business errors without writing cookies", async () => {
    fetchMock.mockRejectedValue(new GraphQLRequestError("private backend details", "BAD_USER_INPUT", "DEMO_DISABLED"));
    expect(await demoSignInAction({}, form())).toEqual(errorState);
    expect([...written]).toEqual([]); expect(redirect).not.toHaveBeenCalled();
  });
  it("returns a retryable generic error for an unavailable cold API without writing cookies", async () => {
    fetchMock.mockRejectedValue(new Error("private connection details"));
    expect(await demoSignInAction({}, form())).toEqual(errorState);
    expect([...written]).toEqual([]); expect(redirect).not.toHaveBeenCalled();
  });
  it("rejects an incomplete session response without writing cookies", async () => {
    fetchMock.mockResolvedValue({ demoSignIn: null });
    expect(await demoSignInAction({}, form())).toEqual(errorState);
    expect([...written]).toEqual([]); expect(redirect).not.toHaveBeenCalled();
  });
});
