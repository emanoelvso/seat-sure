import { describe, expect, it } from "vitest";
import { sessionCookieOptions } from "@/features/auth/utils/session-cookie-options";

// Builds an unsigned JWT with the given `exp` (seconds since epoch) so the
// cookie options can be tested without a real signing key.
function makeJwt(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url",
  );
  const payload = Buffer.from(JSON.stringify({ sub: "user-1", exp })).toString(
    "base64url",
  );
  return `${header}.${payload}.signature`;
}

// AUTH-45: access token exp is 15 minutes out; AUTH-46: the refresh/session
// expiresAt is 30 days out. They're deliberately far apart (L-006) so a test
// that reads the wrong field would fail.
const accessExpSeconds = Math.floor(Date.now() / 1000) + 15 * 60;
const accessToken = makeJwt(accessExpSeconds);
const sessionExpiresAt = new Date(
  Date.now() + 30 * 24 * 60 * 60 * 1000,
).toISOString();

describe("sessionCookieOptions", () => {
  it("sets httpOnly on both cookies (AUTH-44)", () => {
    const result = sessionCookieOptions(
      { accessToken, expiresAt: sessionExpiresAt, persistent: true },
      "development",
    );
    expect(result.access.httpOnly).toBe(true);
    expect(result.refresh.httpOnly).toBe(true);
  });

  it("sets sameSite lax and path / on both cookies", () => {
    const result = sessionCookieOptions(
      { accessToken, expiresAt: sessionExpiresAt, persistent: true },
      "development",
    );
    expect(result.access.sameSite).toBe("lax");
    expect(result.access.path).toBe("/");
    expect(result.refresh.sameSite).toBe("lax");
    expect(result.refresh.path).toBe("/");
  });

  it("sets secure only in production", () => {
    const dev = sessionCookieOptions(
      { accessToken, expiresAt: sessionExpiresAt, persistent: true },
      "development",
    );
    const prod = sessionCookieOptions(
      { accessToken, expiresAt: sessionExpiresAt, persistent: true },
      "production",
    );
    expect(dev.access.secure).toBe(false);
    expect(dev.refresh.secure).toBe(false);
    expect(prod.access.secure).toBe(true);
    expect(prod.refresh.secure).toBe(true);
  });

  it("when persistent, sets the refresh cookie's expires to the session expiresAt (AUTH-46)", () => {
    const result = sessionCookieOptions(
      { accessToken, expiresAt: sessionExpiresAt, persistent: true },
      "development",
    );
    expect(result.refresh.expires).toEqual(new Date(sessionExpiresAt));
  });

  it("when persistent, sets the access cookie's expires to the JWT exp, not the session expiresAt (AUTH-45)", () => {
    const result = sessionCookieOptions(
      { accessToken, expiresAt: sessionExpiresAt, persistent: true },
      "development",
    );
    expect(result.access.expires).toEqual(new Date(accessExpSeconds * 1000));
    expect(result.access.expires).not.toEqual(result.refresh.expires);
  });

  it("when not persistent, sets neither cookie's expires", () => {
    const result = sessionCookieOptions(
      { accessToken, expiresAt: sessionExpiresAt, persistent: false },
      "development",
    );
    expect(result.access.expires).toBeUndefined();
    expect(result.refresh.expires).toBeUndefined();
  });
});
