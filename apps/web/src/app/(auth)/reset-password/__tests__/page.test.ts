import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import {
  hasSession,
  readResetDoneCookie,
  readResetGrantCookie,
} from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";

const { REDIRECT_ERROR } = vi.hoisted(() => ({
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("@/features/auth/api/session-cookies", () => ({
  hasSession: vi.fn(),
  readResetGrantCookie: vi.fn(),
  readResetDoneCookie: vi.fn(),
}));
vi.mock("@/features/auth/api/reset-password-action", () => ({
  resetPasswordAction: vi.fn(),
}));
vi.mock("@/features/auth/components/auth-shell", () => ({
  AuthShell: vi.fn(),
}));
vi.mock("@/features/auth/components/reset-password-form", () => ({
  ResetPasswordForm: vi.fn(),
}));

const mockedHasSession = vi.mocked(hasSession);
const mockedReadResetGrantCookie = vi.mocked(readResetGrantCookie);
const mockedReadResetDoneCookie = vi.mocked(readResetDoneCookie);

function findElement(node: ReactNode, type: unknown): ReactElement | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node;

  return findElement((node.props as { children?: ReactNode }).children, type);
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    mockedHasSession.mockReset();
    mockedReadResetGrantCookie.mockReset();
    mockedReadResetDoneCookie.mockReset().mockResolvedValue(false);
    vi.mocked(redirect).mockClear();
  });

  it("redirects a signed-in visitor to / (AUTH-41)", async () => {
    mockedHasSession.mockResolvedValue(true);

    await expect(ResetPasswordPage()).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("redirects to /forgot-password when there is no reset grant and no done breadcrumb (AUTH-70)", async () => {
    mockedHasSession.mockResolvedValue(false);
    mockedReadResetGrantCookie.mockResolvedValue(null);
    mockedReadResetDoneCookie.mockResolvedValue(false);

    await expect(ResetPasswordPage()).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith("/forgot-password");
  });

  it("renders the shell title, description, and the form (AUTH-61)", async () => {
    mockedHasSession.mockResolvedValue(false);
    mockedReadResetGrantCookie.mockResolvedValue({
      resetToken: "grant-token-abc123",
      expiresAt: "2026-10-02T10:10:00.000Z",
    });

    const page = await ResetPasswordPage();

    expect(redirect).not.toHaveBeenCalled();
    const shell = findElement(page, AuthShell);
    expect(shell).toBeTruthy();
    expect(shell?.props).toMatchObject({
      title: "Reset Password",
      subtitle: "Enter a new password below to change your password.",
    });
    expect(findElement(page, ResetPasswordForm)).toBeTruthy();
  });

  // The grant cookie is deleted inside resetPasswordAction on success, and
  // Next.js refreshes this Server Component right after; without this
  // breadcrumb the visitor would be bounced to /forgot-password before the
  // success dialog (AUTH-67) can render (see reset-password-action.ts).
  it("does not redirect when there is no grant but the reset-done breadcrumb is set", async () => {
    mockedHasSession.mockResolvedValue(false);
    mockedReadResetGrantCookie.mockResolvedValue(null);
    mockedReadResetDoneCookie.mockResolvedValue(true);

    const page = await ResetPasswordPage();

    expect(redirect).not.toHaveBeenCalled();
    expect(findElement(page, ResetPasswordForm)).toBeTruthy();
  });
});
