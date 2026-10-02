import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  setSessionCookies,
  writePendingCookie,
} from "@/features/auth/api/session-cookies";
import { logInAction, type LogInFormState } from "@/features/auth/api/log-in-action";

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
  setSessionCookies: vi.fn(),
  writePendingCookie: vi.fn(),
}));

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedSetSessionCookies = vi.mocked(setSessionCookies);
const mockedWritePendingCookie = vi.mocked(writePendingCookie);

const initialState: LogInFormState = { values: {}, fieldErrors: {} };

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

async function expectRedirectTo(target: string, formData: FormData) {
  await expect(logInAction(initialState, formData)).rejects.toBe(
    REDIRECT_ERROR,
  );
  expect(redirect).toHaveBeenCalledWith(target);
}

const signedInSession = {
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1",
  expiresAt: "2026-11-01T00:00:00.000Z",
  persistent: true,
};

describe("logInAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedSetSessionCookies.mockReset().mockResolvedValue(undefined);
    mockedWritePendingCookie.mockReset().mockResolvedValue(undefined);
    vi.mocked(redirect).mockClear();
  });

  it("shows field messages for an empty email and password and never calls the API (AUTH-37)", async () => {
    const formData = buildFormData({ email: "", password: "" });

    const result = await logInAction(initialState, formData);

    expect(result.fieldErrors).toEqual({
      email: "Enter a valid email address.",
      password: "Enter your password.",
    });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("sends trimmed, lowercased credentials and rememberMe to the API", async () => {
    mockedFetch.mockResolvedValueOnce({
      logIn: {
        status: "SIGNED_IN",
        codeSent: null,
        resendAvailableAt: null,
        session: signedInSession,
      },
    });
    const formData = buildFormData({
      email: "  Kwame.Asante@Example.com  ",
      password: "right-pw!9",
      rememberMe: "on",
    });

    await expectRedirectTo("/", formData);

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      {
        input: {
          email: "kwame.asante@example.com",
          password: "right-pw!9",
          rememberMe: true,
        },
      },
      { revalidate: 0 },
    );
  });

  it("sets session cookies and redirects to the return path on SIGNED_IN (AUTH-31, AUTH-38)", async () => {
    mockedFetch.mockResolvedValueOnce({
      logIn: {
        status: "SIGNED_IN",
        codeSent: null,
        resendAvailableAt: null,
        session: signedInSession,
      },
    });
    const formData = buildFormData({
      email: "kwame.asante@example.com",
      password: "right-pw!9",
      redirectTo: "/events",
    });

    await expectRedirectTo("/events", formData);

    expect(mockedSetSessionCookies).toHaveBeenCalledWith(signedInSession);
  });

  it("falls back to / for an unsafe redirectTo (AUTH-39)", async () => {
    mockedFetch.mockResolvedValueOnce({
      logIn: {
        status: "SIGNED_IN",
        codeSent: null,
        resendAvailableAt: null,
        session: signedInSession,
      },
    });
    const formData = buildFormData({
      email: "kwame.asante@example.com",
      password: "right-pw!9",
      redirectTo: "//evil.com",
    });

    await expectRedirectTo("/", formData);
  });

  it("writes the pending cookie and redirects to /verify-email without starting a session on VERIFICATION_REQUIRED (AUTH-34)", async () => {
    mockedFetch.mockResolvedValueOnce({
      logIn: {
        status: "VERIFICATION_REQUIRED",
        codeSent: true,
        resendAvailableAt: "2026-10-02T10:01:00.000Z",
        session: null,
      },
    });
    const formData = buildFormData({
      email: "kwame.asante@example.com",
      password: "right-pw!9",
      rememberMe: "on",
      redirectTo: "/events",
    });

    await expectRedirectTo("/verify-email", formData);

    expect(mockedWritePendingCookie).toHaveBeenCalledWith({
      email: "kwame.asante@example.com",
      purpose: "verify-email",
      rememberMe: true,
      redirectTo: "/events",
      resendAvailableAt: "2026-10-02T10:01:00.000Z",
      codeSent: true,
    });
    expect(mockedSetSessionCookies).not.toHaveBeenCalled();
  });

  it("shows 'Incorrect email or password.' on INVALID_CREDENTIALS (AUTH-33)", async () => {
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError(
        "Incorrect email or password.",
        "BAD_USER_INPUT",
        "INVALID_CREDENTIALS",
      ),
    );
    const formData = buildFormData({
      email: "kwame.asante@example.com",
      password: "wrong-pw!9",
    });

    const result = await logInAction(initialState, formData);

    expect(result.formError).toBe("Incorrect email or password.");
    expect(mockedSetSessionCookies).not.toHaveBeenCalled();
  });

  it("shows the lockout message on LOGIN_LOCKED (AUTH-35)", async () => {
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError(
        "Too many attempts. Try again in 15 minutes.",
        "BAD_USER_INPUT",
        "LOGIN_LOCKED",
      ),
    );
    const formData = buildFormData({
      email: "kwame.asante@example.com",
      password: "right-pw!9",
    });

    const result = await logInAction(initialState, formData);

    expect(result.formError).toBe("Too many attempts. Try again in 15 minutes.");
    expect(mockedSetSessionCookies).not.toHaveBeenCalled();
  });
});
