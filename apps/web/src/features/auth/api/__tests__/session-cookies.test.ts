import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import {
  setSessionCookies,
  clearSessionCookies,
  hasSession,
  readAccessToken,
  readRefreshToken,
  writePendingCookie,
  readPendingCookie,
  deletePendingCookie,
  writeResetPendingCookie,
  readResetPendingCookie,
  deleteResetPendingCookie,
  writeResetGrantCookie,
  readResetGrantCookie,
  deleteResetGrantCookie,
  writeResetDoneCookie,
  readResetDoneCookie,
} from "@/features/auth/api/session-cookies";

vi.mock("server-only", () => ({}));

// A minimal in-memory stand-in for Next's cookie store, so tests exercise
// the real set/get/delete calls session-cookies.ts makes against it.
function makeCookieStore() {
  const entries = new Map<string, { value: string; options?: unknown }>();
  return {
    set: vi.fn((name: string, value: string, options?: unknown) => {
      entries.set(name, { value, options });
    }),
    get: vi.fn((name: string) => {
      const entry = entries.get(name);
      return entry ? { name, value: entry.value } : undefined;
    }),
    has: vi.fn((name: string) => entries.has(name)),
    delete: vi.fn((name: string) => {
      entries.delete(name);
    }),
    entries,
  };
}

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const mockedCookies = vi.mocked(cookies);

describe("session-cookies", () => {
  let store: ReturnType<typeof makeCookieStore>;

  beforeEach(() => {
    store = makeCookieStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedCookies.mockResolvedValue(store as any);
  });

  describe("setSessionCookies / clearSessionCookies", () => {
    const tokens = {
      accessToken:
        "header." +
        Buffer.from(
          JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 }),
        ).toString("base64url") +
        ".sig",
      refreshToken: "refresh-token-value",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      persistent: true,
    };

    it("writes both the access and refresh cookies with T18's options", async () => {
      await setSessionCookies(tokens);

      expect(store.set).toHaveBeenCalledWith(
        "ss_access",
        tokens.accessToken,
        expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
      );
      expect(store.set).toHaveBeenCalledWith(
        "ss_refresh",
        tokens.refreshToken,
        expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
      );
    });

    it("clears both cookies", async () => {
      await setSessionCookies(tokens);
      await clearSessionCookies();

      expect(store.delete).toHaveBeenCalledWith("ss_access");
      expect(store.delete).toHaveBeenCalledWith("ss_refresh");
    });

    it("hasSession reflects whether the refresh cookie is present", async () => {
      expect(await hasSession()).toBe(false);
      await setSessionCookies(tokens);
      expect(await hasSession()).toBe(true);
    });

    it("reads back the raw access and refresh token values", async () => {
      await setSessionCookies(tokens);
      expect(await readAccessToken()).toBe(tokens.accessToken);
      expect(await readRefreshToken()).toBe(tokens.refreshToken);
    });
  });

  describe("ss_pending", () => {
    it("round-trips its JSON with httpOnly and maxAge 3600", async () => {
      const payload = { email: "a@example.com", purpose: "signup" };
      await writePendingCookie(payload);

      expect(store.set).toHaveBeenCalledWith(
        "ss_pending",
        JSON.stringify(payload),
        expect.objectContaining({ httpOnly: true, maxAge: 3600 }),
      );
      expect(await readPendingCookie()).toEqual(payload);

      await deletePendingCookie();
      expect(store.delete).toHaveBeenCalledWith("ss_pending");
      expect(await readPendingCookie()).toBeNull();
    });

    it("reads malformed JSON as null", async () => {
      store.entries.set("ss_pending", { value: "{not json" });
      expect(await readPendingCookie()).toBeNull();
    });
  });

  describe("ss_reset_pending", () => {
    it("round-trips its JSON with httpOnly and maxAge 3600", async () => {
      const payload = { email: "b@example.com", purpose: "reset" };
      await writeResetPendingCookie(payload);

      expect(store.set).toHaveBeenCalledWith(
        "ss_reset_pending",
        JSON.stringify(payload),
        expect.objectContaining({ httpOnly: true, maxAge: 3600 }),
      );
      expect(await readResetPendingCookie()).toEqual(payload);

      await deleteResetPendingCookie();
      expect(store.delete).toHaveBeenCalledWith("ss_reset_pending");
      expect(await readResetPendingCookie()).toBeNull();
    });
  });

  describe("ss_reset_grant", () => {
    it("round-trips its JSON with httpOnly and maxAge 600", async () => {
      const payload = { token: "reset-grant-token" };
      await writeResetGrantCookie(payload);

      expect(store.set).toHaveBeenCalledWith(
        "ss_reset_grant",
        JSON.stringify(payload),
        expect.objectContaining({ httpOnly: true, maxAge: 600 }),
      );
      expect(await readResetGrantCookie()).toEqual(payload);

      await deleteResetGrantCookie();
      expect(store.delete).toHaveBeenCalledWith("ss_reset_grant");
      expect(await readResetGrantCookie()).toBeNull();
    });
  });

  // Pins the breadcrumb's short lifetime: it only needs to outlive the
  // reset action's own refresh (15517bd). A regression that left it alive
  // for much longer (e.g. 24h) would let a reload of /reset-password show
  // the form instead of redirecting, long after a completed reset.
  describe("ss_reset_done", () => {
    it("writes httpOnly with maxAge 60", async () => {
      await writeResetDoneCookie();

      expect(store.set).toHaveBeenCalledWith(
        "ss_reset_done",
        JSON.stringify(true),
        expect.objectContaining({ httpOnly: true, maxAge: 60 }),
      );
      expect(await readResetDoneCookie()).toBe(true);
    });
  });
});
