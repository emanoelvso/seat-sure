import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { writePendingCookie } from "@/features/auth/api/session-cookies";
import { signUpAction, type SignUpFormState } from "@/features/auth/api/sign-up-action";

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
  writePendingCookie: vi.fn(),
}));

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedWritePendingCookie = vi.mocked(writePendingCookie);

const initialState: SignUpFormState = { values: {}, fieldErrors: {} };

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

async function expectRedirectTo(target: string, formData: FormData) {
  await expect(signUpAction(initialState, formData)).rejects.toBe(
    REDIRECT_ERROR,
  );
  expect(redirect).toHaveBeenCalledWith(target);
}

describe("signUpAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedWritePendingCookie.mockReset().mockResolvedValue(undefined);
    vi.mocked(redirect).mockClear();
  });

  it("shows a field error for each invalid field and never calls the API (AUTH-06..09)", async () => {
    const formData = buildFormData({
      firstName: "",
      lastName: "",
      email: "not-an-email",
      password: "short",
    });

    const result = await signUpAction(initialState, formData);

    expect(result.fieldErrors).toEqual({
      firstName: "Enter your name.",
      lastName: "Enter your last name.",
      email: "Enter a valid email address.",
      password: "Password must be between 8 and 72 characters.",
    });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("echoes submitted values back on error, excluding the password", async () => {
    const formData = buildFormData({
      firstName: "",
      lastName: "Okafor",
      email: "amara.okafor@example.com",
      password: "s3cret-pw!",
    });

    const result = await signUpAction(initialState, formData);

    expect(result.values).toEqual({
      firstName: "",
      lastName: "Okafor",
      email: "amara.okafor@example.com",
      redirectTo: "",
    });
    expect(result.values).not.toHaveProperty("password");
  });

  it("sends trimmed variables, writes the pending cookie, and redirects to /verify-email (AUTH-02, AUTH-04)", async () => {
    mockedFetch.mockResolvedValueOnce({
      signUp: {
        email: "amara.okafor@example.com",
        codeSent: true,
        resendAvailableAt: "2026-10-02T10:01:00.000Z",
      },
    });
    const formData = buildFormData({
      firstName: "  Amara  ",
      lastName: "  Okafor  ",
      email: "  Amara.Okafor@Example.com  ",
      password: "s3cret-pw!",
      rememberMe: "on",
      redirectTo: "/events",
    });

    await expectRedirectTo("/verify-email", formData);

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: {
          firstName: "Amara",
          lastName: "Okafor",
          email: "amara.okafor@example.com",
          password: "s3cret-pw!",
        },
      },
      { revalidate: 0 },
    );
    expect(mockedWritePendingCookie).toHaveBeenCalledWith({
      email: "amara.okafor@example.com",
      purpose: "verify-email",
      rememberMe: true,
      redirectTo: "/events",
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
  });

  it("writes codeSent: false to the pending cookie when the API couldn't send a code (AUTH-13)", async () => {
    mockedFetch.mockResolvedValueOnce({
      signUp: {
        email: "amara.okafor@example.com",
        codeSent: false,
        resendAvailableAt: "2026-10-02T10:01:00.000Z",
      },
    });
    const formData = buildFormData({
      firstName: "Amara",
      lastName: "Okafor",
      email: "amara.okafor@example.com",
      password: "s3cret-pw!",
    });

    await expectRedirectTo("/verify-email", formData);

    expect(mockedWritePendingCookie).toHaveBeenCalledWith(
      expect.objectContaining({ codeSent: false }),
    );
  });

  it("shows the email-taken message under the Email field (AUTH-10)", async () => {
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError(
        "An account with this email already exists.",
        "BAD_USER_INPUT",
        "EMAIL_TAKEN",
      ),
    );
    const formData = buildFormData({
      firstName: "Amara",
      lastName: "Okafor",
      email: "amara.okafor@example.com",
      password: "s3cret-pw!",
    });

    const result = await signUpAction(initialState, formData);

    expect(result.fieldErrors).toEqual({
      email: "An account with this email already exists.",
    });
    expect(mockedWritePendingCookie).not.toHaveBeenCalled();
  });

  it("shows a generic form error on an unexpected failure (AUTH-12)", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("internal server error"));
    const formData = buildFormData({
      firstName: "Amara",
      lastName: "Okafor",
      email: "amara.okafor@example.com",
      password: "s3cret-pw!",
    });

    const result = await signUpAction(initialState, formData);

    expect(result.formError).toBe("Something went wrong. Please try again.");
    expect(result.fieldErrors).toEqual({});
    expect(mockedWritePendingCookie).not.toHaveBeenCalled();
  });
});
