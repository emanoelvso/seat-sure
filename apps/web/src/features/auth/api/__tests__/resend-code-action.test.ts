import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  readPendingCookie,
  readResetPendingCookie,
  writePendingCookie,
  writeResetPendingCookie,
} from "@/features/auth/api/session-cookies";
import { resendCodeAction } from "@/features/auth/api/resend-code-action";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  );
  return { ...actual, graphqlServerFetch: vi.fn() };
});
vi.mock("@/features/auth/api/session-cookies", () => ({
  readPendingCookie: vi.fn(),
  readResetPendingCookie: vi.fn(),
  writePendingCookie: vi.fn(),
  writeResetPendingCookie: vi.fn(),
}));

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedReadPendingCookie = vi.mocked(readPendingCookie);
const mockedReadResetPendingCookie = vi.mocked(readResetPendingCookie);
const mockedWritePendingCookie = vi.mocked(writePendingCookie);
const mockedWriteResetPendingCookie = vi.mocked(writeResetPendingCookie);

describe("resendCodeAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedReadPendingCookie.mockReset();
    mockedReadResetPendingCookie.mockReset();
    mockedWritePendingCookie.mockReset().mockResolvedValue(undefined);
    mockedWriteResetPendingCookie.mockReset().mockResolvedValue(undefined);
  });

  it("calls resendCode with the pending email and purpose, updates the pending cookie, and returns the new values (AUTH-26)", async () => {
    mockedReadPendingCookie.mockResolvedValue({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: true,
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockResolvedValueOnce({
      resendCode: {
        codeSent: true,
        resendAvailableAt: "2026-10-02T10:02:00.000Z",
      },
    });

    const result = await resendCodeAction("verify-email");

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      { input: { email: "amara.okafor@example.com", purpose: "verify-email" } },
      { revalidate: 0 },
    );
    expect(mockedWritePendingCookie).toHaveBeenCalledWith({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: true,
      resendAvailableAt: "2026-10-02T10:02:00.000Z",
      codeSent: true,
    });
    expect(result).toEqual({
      resendAvailableAt: "2026-10-02T10:02:00.000Z",
      codeSent: true,
    });
  });

  it("calls resendCode for the reset-password pending email and updates the reset pending cookie (AUTH-60)", async () => {
    mockedReadResetPendingCookie.mockResolvedValue({
      email: "thandiwe.nkosi@example.com",
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockResolvedValueOnce({
      resendCode: {
        codeSent: true,
        resendAvailableAt: "2026-10-02T10:02:00.000Z",
      },
    });

    const result = await resendCodeAction("reset-password");

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: {
          email: "thandiwe.nkosi@example.com",
          purpose: "reset-password",
        },
      },
      { revalidate: 0 },
    );
    expect(mockedWriteResetPendingCookie).toHaveBeenCalledWith({
      email: "thandiwe.nkosi@example.com",
      resendAvailableAt: "2026-10-02T10:02:00.000Z",
      codeSent: true,
    });
    expect(result).toEqual({
      resendAvailableAt: "2026-10-02T10:02:00.000Z",
      codeSent: true,
    });
  });

  it("returns an error state and leaves the cookie unchanged on RESEND_TOO_SOON (AUTH-27)", async () => {
    mockedReadPendingCookie.mockResolvedValue({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: true,
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError(
        "Please wait before requesting a new code.",
        "BAD_USER_INPUT",
        "RESEND_TOO_SOON",
      ),
    );

    const result = await resendCodeAction("verify-email");

    expect(result).toEqual({
      error: "We couldn't send the code. Please try again.",
    });
    expect(mockedWritePendingCookie).not.toHaveBeenCalled();
  });

  it("returns the generic send-failure message on a network failure", async () => {
    mockedReadPendingCookie.mockResolvedValue({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: true,
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    mockedFetch.mockRejectedValueOnce(new Error("network down"));

    const result = await resendCodeAction("verify-email");

    expect(result).toEqual({
      error: "We couldn't send the code. Please try again.",
    });
    expect(mockedWritePendingCookie).not.toHaveBeenCalled();
  });
});
