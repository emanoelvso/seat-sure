import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  deleteResetGrantCookie,
  readResetGrantCookie,
  writeResetDoneCookie,
} from "@/features/auth/api/session-cookies";
import {
  resetPasswordAction,
  type ResetPasswordFormState,
} from "@/features/auth/api/reset-password-action";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  );
  return { ...actual, graphqlServerFetch: vi.fn() };
});
vi.mock("@/features/auth/api/session-cookies", () => ({
  readResetGrantCookie: vi.fn(),
  deleteResetGrantCookie: vi.fn(),
  writeResetDoneCookie: vi.fn(),
}));

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedReadResetGrantCookie = vi.mocked(readResetGrantCookie);
const mockedDeleteResetGrantCookie = vi.mocked(deleteResetGrantCookie);
const mockedWriteResetDoneCookie = vi.mocked(writeResetDoneCookie);

const initialState: ResetPasswordFormState = { fieldErrors: {} };

const grant = {
  resetToken: "grant-token-abc123",
  expiresAt: "2026-10-02T10:10:00.000Z",
};

function buildFormData(newPassword: string, confirmPassword: string): FormData {
  const formData = new FormData();
  formData.set("newPassword", newPassword);
  formData.set("confirmPassword", confirmPassword);
  return formData;
}

describe("resetPasswordAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedReadResetGrantCookie.mockReset().mockResolvedValue(grant);
    mockedDeleteResetGrantCookie.mockReset().mockResolvedValue(undefined);
    mockedWriteResetDoneCookie.mockReset().mockResolvedValue(undefined);
  });

  it("shows 'Passwords don't match.' and never calls the API when the two passwords differ (AUTH-62)", async () => {
    const formData = buildFormData("correct-horse-1", "correct-horse-2");

    const result = await resetPasswordAction(initialState, formData);

    expect(result.fieldErrors).toEqual({
      confirmPassword: "Passwords don't match.",
    });
    expect(result.status).toBeUndefined();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("shows the length message for a 7-character password (AUTH-63)", async () => {
    const formData = buildFormData("short12", "short12");

    const result = await resetPasswordAction(initialState, formData);

    expect(result.fieldErrors).toEqual({
      newPassword: "Password must be between 8 and 72 characters.",
    });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("calls the API with the grant token and new password, deletes the grant, and starts no session on success (AUTH-64, AUTH-67)", async () => {
    mockedFetch.mockResolvedValueOnce({ resetPassword: true });
    const formData = buildFormData("new-strong-pass", "new-strong-pass");

    const result = await resetPasswordAction(initialState, formData);

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: {
          resetToken: "grant-token-abc123",
          newPassword: "new-strong-pass",
        },
      },
      { revalidate: 0 },
    );
    expect(mockedDeleteResetGrantCookie).toHaveBeenCalledTimes(1);
    // Written alongside the grant deletion so /reset-password's "no grant"
    // guard doesn't bounce the visitor away before the success dialog
    // renders (see reset-password-action.ts's comment on this call).
    expect(mockedWriteResetDoneCookie).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ fieldErrors: {}, status: "success" });
  });

  it("returns failed/restart when the grant is invalid or expired (AUTH-68)", async () => {
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError(
        "grant invalid",
        "UNPROCESSABLE_ENTITY",
        "RESET_GRANT_INVALID",
      ),
    );
    const formData = buildFormData("new-strong-pass", "new-strong-pass");

    const result = await resetPasswordAction(initialState, formData);

    expect(result).toEqual({ fieldErrors: {}, status: "failed", retry: "restart" });
    expect(mockedDeleteResetGrantCookie).not.toHaveBeenCalled();
  });

  it("returns failed/restart when there is no reset grant cookie", async () => {
    mockedReadResetGrantCookie.mockResolvedValue(null);
    const formData = buildFormData("new-strong-pass", "new-strong-pass");

    const result = await resetPasswordAction(initialState, formData);

    expect(result).toEqual({ fieldErrors: {}, status: "failed", retry: "restart" });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns failed/stay on an unexpected (e.g. 500) failure (AUTH-69)", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("internal server error"));
    const formData = buildFormData("new-strong-pass", "new-strong-pass");

    const result = await resetPasswordAction(initialState, formData);

    expect(result).toEqual({ fieldErrors: {}, status: "failed", retry: "stay" });
    expect(mockedDeleteResetGrantCookie).not.toHaveBeenCalled();
  });
});
