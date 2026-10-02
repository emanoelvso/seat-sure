import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { hasSession } from "@/features/auth/api/session-cookies";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import SignUpPage from "@/app/(auth)/signup/page";

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
vi.mock("@/features/auth/components/sign-up-form", () => ({
  SignUpForm: vi.fn(),
}));

const mockedHasSession = vi.mocked(hasSession);

function searchParams(params: { redirectTo?: string }) {
  return { searchParams: Promise.resolve(params) };
}

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

describe("SignUpPage", () => {
  beforeEach(() => {
    mockedHasSession.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("redirects a signed-in visitor to / (AUTH-41)", async () => {
    mockedHasSession.mockResolvedValue(true);

    await expect(SignUpPage(searchParams({}))).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("renders the AuthShell and SignUpForm with redirectTo from the query", async () => {
    mockedHasSession.mockResolvedValue(false);

    const page = await SignUpPage(searchParams({ redirectTo: "/events" }));

    expect(redirect).not.toHaveBeenCalled();
    expect(findElement(page, AuthShell)?.props).toMatchObject({
      title: "Please enter your details to sign up",
    });
    expect(findElement(page, SignUpForm)?.props).toEqual({
      redirectTo: "/events",
    });
  });
});
