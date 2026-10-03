import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { hasSession } from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";

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
}));
vi.mock("@/features/auth/components/auth-shell", () => ({
  AuthShell: vi.fn(),
}));
vi.mock("@/features/auth/components/forgot-password-form", () => ({
  ForgotPasswordForm: vi.fn(),
}));

const mockedHasSession = vi.mocked(hasSession);

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

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    mockedHasSession.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("redirects a signed-in visitor to / (AUTH-41)", async () => {
    mockedHasSession.mockResolvedValue(true);

    await expect(ForgotPasswordPage()).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("renders the shell title, the spec description, and the form (AUTH-56)", async () => {
    mockedHasSession.mockResolvedValue(false);

    const page = await ForgotPasswordPage();

    expect(redirect).not.toHaveBeenCalled();
    const shell = findElement(page, AuthShell);
    expect(shell).toBeTruthy();
    expect(shell?.props).toMatchObject({
      title: "Forgot your password?",
      subtitle:
        "Please enter the email address associated with your account and we'll send you a verification code.",
    });
    expect(findElement(page, ForgotPasswordForm)).toBeTruthy();
  });
});
