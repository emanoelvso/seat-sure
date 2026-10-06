import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import { NO_SESSION, withAccessToken } from "@/features/auth/api/with-access-token";
import { UPDATE_MY_PROFILE } from "@/features/account/api/update-my-profile";
import { updatePersonalInfoAction } from "@/features/account/api/update-personal-info-action";
import type {
  PersonalInfoFormState,
  PersonalInfoValues,
} from "@/features/account/utils/personal-info-schema";

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
vi.mock("@/features/auth/api/with-access-token", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/auth/api/with-access-token")
  >("@/features/auth/api/with-access-token");
  return { ...actual, withAccessToken: vi.fn() };
});

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedWithAccessToken = vi.mocked(withAccessToken);

const initialState: PersonalInfoFormState = { status: "idle", fieldErrors: {} };

const values: PersonalInfoValues = {
  firstName: "  Sara ",
  lastName: "Lopez",
  state: "Madrid",
  city: "",
  birthDate: "1995-08-17",
  phoneCountryCode: "+34",
  phoneNumber: "5588 554 88",
  zipCode: "28013",
};

const stored = {
  __typename: "UserProfile" as const,
  id: "user-1",
  firstName: "Sara",
  lastName: "Lopez",
  avatarUrl: null,
  state: "Madrid",
  city: null,
  birthDate: "1995-08-17",
  phoneCountryCode: "+34",
  phoneNumber: "558855488",
  zipCode: "28013",
};

describe("updatePersonalInfoAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedWithAccessToken.mockReset();
    vi.mocked(redirect).mockClear();
    mockedWithAccessToken.mockImplementation((fn) => fn("access-token-1"));
  });

  it("returns field errors and makes no API call for invalid values (PROFILE-04)", async () => {
    const result = await updatePersonalInfoAction(initialState, {
      ...values,
      firstName: " ",
      zipCode: "1",
    });

    expect(result).toEqual({
      status: "error",
      fieldErrors: {
        firstName: "Enter your name.",
        zipCode: "Enter a valid zip code.",
      },
    });
    expect(mockedWithAccessToken).not.toHaveBeenCalled();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("sends the normalized values with the token and returns the stored profile as form values (PROFILE-03)", async () => {
    mockedFetch.mockResolvedValueOnce({ updateMyProfile: stored });

    const result = await updatePersonalInfoAction(initialState, values);

    expect(mockedFetch).toHaveBeenCalledWith(
      UPDATE_MY_PROFILE,
      {
        input: {
          firstName: "Sara",
          lastName: "Lopez",
          state: "Madrid",
          city: "",
          birthDate: "1995-08-17",
          phoneCountryCode: "+34",
          phoneNumber: "558855488",
          zipCode: "28013",
        },
      },
      { revalidate: 0, accessToken: "access-token-1" },
    );
    expect(result).toEqual({
      status: "saved",
      saved: {
        firstName: "Sara",
        lastName: "Lopez",
        state: "Madrid",
        city: "",
        birthDate: "1995-08-17",
        phoneCountryCode: "+34",
        phoneNumber: "558855488",
        zipCode: "28013",
      },
      fieldErrors: {},
    });
  });

  it("shows the API's field errors for INVALID_INPUT (PROFILE-04)", async () => {
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("Invalid", "BAD_USER_INPUT", "INVALID_INPUT", {
        birthDate: "Enter a valid date of birth.",
      }),
    );

    const result = await updatePersonalInfoAction(initialState, values);

    expect(result).toEqual({
      status: "error",
      fieldErrors: { birthDate: "Enter a valid date of birth." },
    });
  });

  it("returns the generic form error for any other API failure and keeps no field errors (PROFILE-05)", async () => {
    mockedFetch.mockRejectedValueOnce(
      new GraphQLRequestError("Gone", "NOT_FOUND", "PROFILE_NOT_FOUND"),
    );

    const result = await updatePersonalInfoAction(initialState, values);

    expect(result).toEqual({
      status: "error",
      fieldErrors: {},
      formError: "Something went wrong. Please try again.",
    });
  });

  it("returns the generic form error for a network failure (PROFILE-05)", async () => {
    mockedFetch.mockRejectedValueOnce(new TypeError("fetch failed"));

    const result = await updatePersonalInfoAction(initialState, values);

    expect(result.formError).toBe("Something went wrong. Please try again.");
    expect(result.status).toBe("error");
  });

  it("redirects to login with the personal info path when there is no session (PROFILE-06)", async () => {
    mockedWithAccessToken.mockResolvedValueOnce(NO_SESSION);

    await expect(updatePersonalInfoAction(initialState, values)).rejects.toBe(
      REDIRECT_ERROR,
    );

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fpersonal-info",
    );
  });
});
