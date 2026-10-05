import "server-only";
import { cookies } from "next/headers";
import { sessionCookieOptions } from "@/features/auth/utils/session-cookie-options";
import type { SessionTokens } from "@/types/__generated__/schema";

// Cookie names (AUTH-44), shared with the design doc so other modules can
// reference them without re-typing the strings.
export const ACCESS_COOKIE = "ss_access";
export const REFRESH_COOKIE = "ss_refresh";
const PENDING_COOKIE = "ss_pending";
const RESET_PENDING_COOKIE = "ss_reset_pending";
const RESET_GRANT_COOKIE = "ss_reset_grant";
// A short breadcrumb written alongside deleting ss_reset_grant on a
// successful reset (AUTH-67). Next.js refreshes any Server Component that
// read ss_reset_grant as soon as a Server Action deletes it; without this,
// /reset-password's "no grant -> /forgot-password" guard (AUTH-70) would
// fire on that very refresh and the success dialog would never render.
const RESET_DONE_COOKIE = "ss_reset_done";

const PENDING_MAX_AGE = 60 * 60; // 1h
const RESET_GRANT_MAX_AGE = 10 * 60; // 10min
const RESET_DONE_MAX_AGE = 60; // 1min: only needs to outlive the action's refresh

function jsonCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export async function setSessionCookies(
  tokens: Pick<
    SessionTokens,
    "accessToken" | "refreshToken" | "expiresAt" | "persistent"
  >,
): Promise<void> {
  const store = await cookies();
  const { access, refresh } = sessionCookieOptions(
    tokens,
    process.env.NODE_ENV ?? "development",
  );
  store.set(ACCESS_COOKIE, tokens.accessToken, access);
  if (tokens.refreshToken) {
    store.set(REFRESH_COOKIE, tokens.refreshToken, refresh);
  }
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return store.has(REFRESH_COOKIE);
}

export async function readAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

export async function readRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value;
}

async function writeJsonCookie(
  name: string,
  data: unknown,
  maxAge: number,
): Promise<void> {
  const store = await cookies();
  store.set(name, JSON.stringify(data), jsonCookieOptions(maxAge));
}

async function readJsonCookie<T>(name: string): Promise<T | null> {
  const store = await cookies();
  const raw = store.get(name)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function deleteJsonCookie(name: string): Promise<void> {
  const store = await cookies();
  store.delete(name);
}

export function writePendingCookie(data: unknown): Promise<void> {
  return writeJsonCookie(PENDING_COOKIE, data, PENDING_MAX_AGE);
}

export function readPendingCookie<T>(): Promise<T | null> {
  return readJsonCookie<T>(PENDING_COOKIE);
}

export function deletePendingCookie(): Promise<void> {
  return deleteJsonCookie(PENDING_COOKIE);
}

export function writeResetPendingCookie(data: unknown): Promise<void> {
  return writeJsonCookie(RESET_PENDING_COOKIE, data, PENDING_MAX_AGE);
}

export function readResetPendingCookie<T>(): Promise<T | null> {
  return readJsonCookie<T>(RESET_PENDING_COOKIE);
}

export function deleteResetPendingCookie(): Promise<void> {
  return deleteJsonCookie(RESET_PENDING_COOKIE);
}

export function writeResetGrantCookie(data: unknown): Promise<void> {
  return writeJsonCookie(RESET_GRANT_COOKIE, data, RESET_GRANT_MAX_AGE);
}

export function readResetGrantCookie<T>(): Promise<T | null> {
  return readJsonCookie<T>(RESET_GRANT_COOKIE);
}

export function deleteResetGrantCookie(): Promise<void> {
  return deleteJsonCookie(RESET_GRANT_COOKIE);
}

export function writeResetDoneCookie(): Promise<void> {
  return writeJsonCookie(RESET_DONE_COOKIE, true, RESET_DONE_MAX_AGE);
}

export function readResetDoneCookie(): Promise<boolean | null> {
  return readJsonCookie<boolean>(RESET_DONE_COOKIE);
}
