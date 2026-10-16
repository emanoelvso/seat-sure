import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { hasSession } from "@/features/auth/api/session-cookies";
import { DemoSignInForm } from "@/features/auth/components/demo-sign-in-form";
import { LogInForm } from "@/features/auth/components/log-in-form";
import LogInPage from "@/app/(auth)/login/page";
import SignUpPage from "@/app/(auth)/signup/page";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import ForgotPasswordVerifyPage from "@/app/(auth)/forgot-password/verify/page";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";

const { REDIRECT_ERROR } = vi.hoisted(() => ({ REDIRECT_ERROR: new Error("NEXT_REDIRECT") }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw REDIRECT_ERROR; }) }));
vi.mock("@/features/auth/api/session-cookies", () => ({ hasSession: vi.fn() }));
vi.mock("@/features/auth/components/auth-shell", () => ({ AuthShell: vi.fn() }));
vi.mock("@/features/auth/components/demo-sign-in-form", () => ({ DemoSignInForm: vi.fn() }));
vi.mock("@/features/auth/components/log-in-form", () => ({ LogInForm: vi.fn() }));
function find(node: ReactNode, type: unknown): ReactElement | undefined {
  if (Array.isArray(node)) return node.map(child => find(child, type)).find(Boolean);
  if (!isValidElement(node)) return undefined;
  return node.type === type ? node : find((node.props as { children?: ReactNode }).children, type);
}
const params = (redirectTo?: string) => ({ searchParams: Promise.resolve({ redirectTo }) });
describe("demo auth pages", () => {
  beforeEach(() => { vi.stubEnv("DEMO_MODE", "true"); vi.mocked(hasSession).mockResolvedValue(false); vi.mocked(redirect).mockClear(); });
  afterEach(() => { vi.unstubAllEnvs(); });
  it("replaces credentials with demo entry and preserves a safe local return path", async () => {
    const page = await LogInPage(params("/events"));
    expect(find(page, DemoSignInForm)?.props).toEqual({ redirectTo: "/events" });
    expect(find(page, LogInForm)).toBeUndefined();
  });
  it("normal login remains the credential form when demo mode is off", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    const page = await LogInPage(params("/events"));
    expect(find(page, LogInForm)?.props).toEqual({ redirectTo: "/events" });
    expect(find(page, DemoSignInForm)).toBeUndefined();
  });
  it("sanitizes an unsafe demo return path before passing it to the form", async () => {
    expect(find(await LogInPage(params("//outside.invalid")), DemoSignInForm)?.props).toEqual({ redirectTo: "/" });
  });
  it("keeps signed-in visitors on the existing home redirect", async () => {
    vi.mocked(hasSession).mockResolvedValue(true);
    await expect(LogInPage(params())).rejects.toBe(REDIRECT_ERROR);
    expect(redirect).toHaveBeenCalledWith("/");
  });
  it("redirects demo signup to demo login with a safe return path", async () => {
    await expect(SignUpPage(params("/events"))).rejects.toBe(REDIRECT_ERROR);
    expect(redirect).toHaveBeenCalledWith("/login?redirectTo=%2Fevents");
  });
  it.each([ForgotPasswordPage, ForgotPasswordVerifyPage, ResetPasswordPage, VerifyEmailPage])("guards demo verification/reset routes before rendering email/code/password UI", async (Page) => {
    await expect(Page()).rejects.toBe(REDIRECT_ERROR);
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
