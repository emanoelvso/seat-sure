import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import {
  hasSession,
  readResetPendingCookie,
} from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { CodeVerificationForm } from "@/features/auth/components/code-verification-form";
import ForgotPasswordVerifyPage from "@/app/(auth)/forgot-password/verify/page";

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
  readResetPendingCookie: vi.fn(),
}));
vi.mock("@/features/auth/api/verify-code-action", () => ({
  verifyCodeAction: vi.fn(),
}));
vi.mock("@/features/auth/api/resend-code-action", () => ({
  resendCodeAction: vi.fn(),
}));
vi.mock("@/features/auth/components/auth-shell", () => ({
  AuthShell: vi.fn(),
}));
vi.mock("@/features/auth/components/code-verification-form", () => ({
  CodeVerificationForm: vi.fn(),
}));

const mockedHasSession = vi.mocked(hasSession);
const mockedReadResetPendingCookie = vi.mocked(readResetPendingCookie);

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

describe("ForgotPasswordVerifyPage", () => {
  beforeEach(() => {
    mockedHasSession.mockReset();
    mockedReadResetPendingCookie.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("redirects a signed-in visitor to / (AUTH-41)", async () => {
    mockedHasSession.mockResolvedValue(true);

    await expect(ForgotPasswordVerifyPage()).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("redirects to /forgot-password when there is no pending reset (AUTH-70)", async () => {
    mockedHasSession.mockResolvedValue(false);
    mockedReadResetPendingCookie.mockResolvedValue(null);

    await expect(ForgotPasswordVerifyPage()).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith("/forgot-password");
  });

  it("renders CodeVerificationForm bound to reset-password with the spec copy (AUTH-60)", async () => {
    mockedHasSession.mockResolvedValue(false);
    mockedReadResetPendingCookie.mockResolvedValue({
      email: "thandiwe.nkosi@example.com",
      resendAvailableAt: "2026-10-02T10:02:00.000Z",
      codeSent: true,
    });

    const page = await ForgotPasswordVerifyPage();

    expect(redirect).not.toHaveBeenCalled();
    expect(findElement(page, AuthShell)).toBeTruthy();
    expect(findElement(page, CodeVerificationForm)?.props).toMatchObject({
      purpose: "reset-password",
      title: "Request sent successfully!",
      description:
        "We've sent a 6-digit confirmation code to your email. Please enter the code in the box below to verify your reset password request.",
      resendAvailableAt: "2026-10-02T10:02:00.000Z",
      codeSent: true,
    });
  });
});
