import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  deletePendingCookie,
  deleteResetPendingCookie,
  readPendingCookie,
  readResetPendingCookie,
  setSessionCookies,
  writeResetGrantCookie,
} from "@/features/auth/api/session-cookies";
import {
  verifyCodeAction,
  type CodeVerificationConfirmState,
} from "@/features/auth/api/verify-code-action";

const { REDIRECT_ERROR } = vi.hoisted(() => ({
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("@/lib/graphql-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  );
  return { ...actual, graphqlServerFetch: vi.fn() };
});
vi.mock("@/features/auth/api/session-cookies", () => ({
  readPendingCookie: vi.fn(),
  readResetPendingCookie: vi.fn(),
  setSessionCookies: vi.fn(),
  deletePendingCookie: vi.fn(),
  writeResetGrantCookie: vi.fn(),
  deleteResetPendingCookie: vi.fn(),
}));

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedReadPendingCookie = vi.mocked(readPendingCookie);
const mockedReadResetPendingCookie = vi.mocked(readResetPendingCookie);
const mockedSetSessionCookies = vi.mocked(setSessionCookies);
const mockedDeletePendingCookie = vi.mocked(deletePendingCookie);
const mockedWriteResetGrantCookie = vi.mocked(writeResetGrantCookie);
const mockedDeleteResetPendingCookie = vi.mocked(deleteResetPendingCookie);

const initialState: CodeVerificationConfirmState = {};

function buildFormData(code: string): FormData {
  const formData = new FormData();
  formData.set("code", code);
  return formData;
}

async function expectRedirectTo(
  target: string,
  purpose: "verify-email" | "reset-password",
  formData: FormData,
) {
  await expect(
    verifyCodeAction(purpose, initialState, formData),
  ).rejects.toBe(REDIRECT_ERROR);
  expect(redirect).toHaveBeenCalledWith(target);
}

describe("verifyCodeAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedReadPendingCookie.mockReset();
    mockedReadResetPendingCookie.mockReset();
    mockedSetSessionCookies.mockReset().mockResolvedValue(undefined);
    mockedDeletePendingCookie.mockReset().mockResolvedValue(undefined);
    mockedWriteResetGrantCookie.mockReset().mockResolvedValue(undefined);
    mockedDeleteResetPendingCookie.mockReset().mockResolvedValue(undefined);
    vi.mocked(redirect).mockClear();
  });

  it("verifies with the pending email and rememberMe, starts the session, deletes the pending cookie, and redirects to the pending path (AUTH-20)", async () => {
    mockedReadPendingCookie.mockResolvedValue({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: true,
      redirectTo: "/events",
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockResolvedValueOnce({
      verifyEmail: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: "2026-10-02T11:00:00.000Z",
        persistent: true,
      },
    });

    await expectRedirectTo(
      "/events",
      "verify-email",
      buildFormData("527655"),
    );

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: {
          email: "amara.okafor@example.com",
          code: "527655",
          rememberMe: true,
        },
      },
      { revalidate: 0 },
    );
    expect(mockedSetSessionCookies).toHaveBeenCalledWith({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: "2026-10-02T11:00:00.000Z",
      persistent: true,
    });
    expect(mockedDeletePendingCookie).toHaveBeenCalled();
  });

  it("redirects to / when the pending cookie has no redirectTo", async () => {
    mockedReadPendingCookie.mockResolvedValue({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: false,
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockResolvedValueOnce({
      verifyEmail: {
        accessToken: "access-token",
        refreshToken: null,
        expiresAt: "2026-10-02T11:00:00.000Z",
        persistent: false,
      },
    });

    await expectRedirectTo("/", "verify-email", buildFormData("527655"));
  });

  it("writes the reset grant, deletes the reset pending cookie, and redirects to /reset-password (AUTH-60)", async () => {
    mockedReadResetPendingCookie.mockResolvedValue({
      email: "thandiwe.nkosi@example.com",
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockResolvedValueOnce({
      confirmPasswordResetCode: {
        resetToken: "reset-token-123",
        expiresAt: "2026-10-02T10:11:00.000Z",
      },
    });

    await expectRedirectTo(
      "/reset-password",
      "reset-password",
      buildFormData("183420"),
    );

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: { email: "thandiwe.nkosi@example.com", code: "183420" },
      },
      { revalidate: 0 },
    );
    expect(mockedWriteResetGrantCookie).toHaveBeenCalledWith({
      resetToken: "reset-token-123",
      expiresAt: "2026-10-02T10:11:00.000Z",
    });
    expect(mockedDeleteResetPendingCookie).toHaveBeenCalled();
  });

  it("returns CODE_INCORRECT when the confirmed code doesn't match (AUTH-21)", async () => {
    mockedReadPendingCookie.mockResolvedValue({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: false,
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError(
        "Incorrect code.",
        "BAD_USER_INPUT",
        "CODE_INCORRECT",
      ),
    );

    const result = await verifyCodeAction(
      "verify-email",
      initialState,
      buildFormData("111111"),
    );

    expect(result).toEqual({ error: "CODE_INCORRECT" });
    expect(mockedDeletePendingCookie).not.toHaveBeenCalled();
  });

  it("returns CODE_EXPIRED when the code was sent more than 10 minutes ago (AUTH-22)", async () => {
    mockedReadPendingCookie.mockResolvedValue({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: false,
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError(
        "Code expired.",
        "BAD_USER_INPUT",
        "CODE_EXPIRED",
      ),
    );

    const result = await verifyCodeAction(
      "verify-email",
      initialState,
      buildFormData("527655"),
    );

    expect(result).toEqual({ error: "CODE_EXPIRED" });
  });

  it("returns CODE_ATTEMPTS_EXCEEDED after 5 wrong attempts (AUTH-23)", async () => {
    mockedReadPendingCookie.mockResolvedValue({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: false,
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError(
        "Too many attempts.",
        "BAD_USER_INPUT",
        "CODE_ATTEMPTS_EXCEEDED",
      ),
    );

    const result = await verifyCodeAction(
      "verify-email",
      initialState,
      buildFormData("527655"),
    );

    expect(result).toEqual({ error: "CODE_ATTEMPTS_EXCEEDED" });
  });

  it("redirects to /login when there is no pending verify-email cookie", async () => {
    mockedReadPendingCookie.mockResolvedValue(null);

    await expectRedirectTo(
      "/login",
      "verify-email",
      buildFormData("527655"),
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("redirects to /forgot-password when there is no pending reset cookie", async () => {
    mockedReadResetPendingCookie.mockResolvedValue(null);

    await expectRedirectTo(
      "/forgot-password",
      "reset-password",
      buildFormData("527655"),
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
