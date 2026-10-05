import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { writeResetPendingCookie } from "@/features/auth/api/session-cookies";
import {
  requestPasswordResetAction,
  type RequestPasswordResetFormState,
} from "@/features/auth/api/request-password-reset-action";

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
  writeResetPendingCookie: vi.fn(),
}));

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedWriteResetPendingCookie = vi.mocked(writeResetPendingCookie);

const initialState: RequestPasswordResetFormState = {
  values: {},
  fieldErrors: {},
};

function buildFormData(email: string): FormData {
  const formData = new FormData();
  formData.set("email", email);
  return formData;
}

async function expectRedirectTo(target: string, formData: FormData) {
  await expect(
    requestPasswordResetAction(initialState, formData),
  ).rejects.toBe(REDIRECT_ERROR);
  expect(redirect).toHaveBeenCalledWith(target);
}

describe("requestPasswordResetAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedWriteResetPendingCookie.mockReset().mockResolvedValue(undefined);
    vi.mocked(redirect).mockClear();
  });

  it("shows the email error and never calls the API or redirects for an invalid email (AUTH-59)", async () => {
    const formData = buildFormData("not-an-email");

    const result = await requestPasswordResetAction(initialState, formData);

    expect(result.fieldErrors).toEqual({
      email: "Enter a valid email address.",
    });
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(mockedWriteResetPendingCookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("calls the API with the normalized email, writes the pending cookie, and redirects to /forgot-password/verify (AUTH-57)", async () => {
    mockedFetch.mockResolvedValueOnce({
      requestPasswordReset: {
        codeSent: true,
        resendAvailableAt: "2026-10-02T10:01:00.000Z",
      },
    });
    const formData = buildFormData("  Thandiwe.Nkosi@Example.com  ");

    await expectRedirectTo("/forgot-password/verify", formData);

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      { input: { email: "thandiwe.nkosi@example.com" } },
      { revalidate: 0 },
    );
    expect(mockedWriteResetPendingCookie).toHaveBeenCalledWith({
      email: "thandiwe.nkosi@example.com",
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
  });

  it("redirects to /forgot-password/verify and sends no code when the account doesn't exist (AUTH-58)", async () => {
    mockedFetch.mockResolvedValueOnce({
      requestPasswordReset: {
        codeSent: false,
        resendAvailableAt: "2026-10-02T10:01:00.000Z",
      },
    });
    const formData = buildFormData("no-account@example.com");

    await expectRedirectTo("/forgot-password/verify", formData);

    expect(mockedWriteResetPendingCookie).toHaveBeenCalledWith(
      expect.objectContaining({ codeSent: false }),
    );
  });

  it("shows a generic form error on an unexpected failure", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("internal server error"));
    const formData = buildFormData("thandiwe.nkosi@example.com");

    const result = await requestPasswordResetAction(initialState, formData);

    expect(result.formError).toBe("Something went wrong. Please try again.");
    expect(mockedWriteResetPendingCookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
