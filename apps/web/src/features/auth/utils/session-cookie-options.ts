import type { SessionTokens } from "@/types/__generated__/schema";

export interface SessionCookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  secure: boolean;
  expires?: Date;
}

export interface SessionCookies {
  access: SessionCookieOptions;
  refresh: SessionCookieOptions;
}

// Reads the `exp` claim (seconds since epoch) off the access token's own JWT
// payload, with no signature verification: the web server only needs to
// mirror the expiry of a token the API already issued and vouched for.
function decodeJwtExpiry(token: string): Date {
  const [, payload] = token.split(".");
  const json = Buffer.from(payload, "base64url").toString("utf8");
  const { exp } = JSON.parse(json) as { exp: number };
  return new Date(exp * 1000);
}

export function sessionCookieOptions(
  tokens: Pick<SessionTokens, "accessToken" | "expiresAt" | "persistent">,
  env: string,
): SessionCookies {
  const base: SessionCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: env === "production",
  };

  if (!tokens.persistent) {
    return { access: { ...base }, refresh: { ...base } };
  }

  return {
    access: { ...base, expires: decodeJwtExpiry(tokens.accessToken) },
    refresh: { ...base, expires: new Date(tokens.expiresAt) },
  };
}
