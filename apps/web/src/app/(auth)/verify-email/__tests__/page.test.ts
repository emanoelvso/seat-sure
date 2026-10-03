import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import {
  hasSession,
  readPendingCookie,
} from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { CodeVerificationForm } from "@/features/auth/components/code-verification-form";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";

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
  readPendingCookie: vi.fn(),
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
const mockedReadPendingCookie = vi.mocked(readPendingCookie);

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

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    mockedHasSession.mockReset();
    mockedReadPendingCookie.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("redirects a signed-in visitor to / (AUTH-41)", async () => {
    mockedHasSession.mockResolvedValue(true);

    await expect(VerifyEmailPage()).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("redirects to /login when there is no pending verification (AUTH-28)", async () => {
    mockedHasSession.mockResolvedValue(false);
    mockedReadPendingCookie.mockResolvedValue(null);

    await expect(VerifyEmailPage()).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders CodeVerificationForm bound to verify-email with the pending resendAvailableAt and codeSent (AUTH-14)", async () => {
    mockedHasSession.mockResolvedValue(false);
    mockedReadPendingCookie.mockResolvedValue({
      resendAvailableAt: "2026-10-02T10:02:00.000Z",
      codeSent: true,
    });

    const page = await VerifyEmailPage();

    expect(redirect).not.toHaveBeenCalled();
    expect(findElement(page, AuthShell)).toBeTruthy();
    expect(findElement(page, CodeVerificationForm)?.props).toMatchObject({
      purpose: "verify-email",
      title: "Email Verification Code",
      description:
        "We've sent a 6-digit confirmation code to your email. Please enter the code in the box below to verify your email.",
      resendAvailableAt: "2026-10-02T10:02:00.000Z",
      codeSent: true,
    });
  });
});
