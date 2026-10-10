import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  readAccessToken,
  readRefreshToken,
} from "@/features/auth/api/session-cookies";
import { ME } from "@/features/auth/api/me";
import { MY_PROFILE } from "@/features/account/api/find-my-profile";
import { getPersonalInfoPageData } from "@/features/account/api/get-personal-info-page-data";

const { REDIRECT_ERROR } = vi.hoisted(() => ({
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("@/features/auth/api/session-cookies");
vi.mock("@/lib/graphql-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  );
  return { ...actual, graphqlServerFetch: vi.fn() };
});

const mockedFetch = vi.mocked(graphqlServerFetch);
const mockedReadAccessToken = vi.mocked(readAccessToken);
const mockedReadRefreshToken = vi.mocked(readRefreshToken);

const PATH = "/account/personal-info";

const me = {
  __typename: "CurrentUser" as const,
  id: "user-1",
  email: "negar@example.com",
  firstName: "Negar",
  lastName: "Khosravi",
  avatarUrl: null,
};

const myProfile = {
  __typename: "UserProfile" as const,
  id: "user-1",
  firstName: "Negar",
  lastName: "Khosravi",
  avatarUrl: null,
  state: "Texas",
  city: null,
  birthDate: "1995-08-17",
  phoneCountryCode: "+49",
  phoneNumber: "558855488",
  zipCode: null,
};

function mockResponses() {
  mockedFetch.mockImplementation((async (document: unknown) => {
    if (document === ME) return { me };
    if (document === MY_PROFILE) return { myProfile };
    throw new Error("unexpected document");
  }) as unknown as typeof graphqlServerFetch);
}

describe("getPersonalInfoPageData", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedReadAccessToken.mockReset();
    mockedReadRefreshToken.mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("returns the user's email and own profile, both requested with the token and revalidate: 0 (PROFILE-01, PROFILE-02)", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    mockResponses();

    const result = await getPersonalInfoPageData(PATH);

    expect(result).toEqual({ email: "negar@example.com", profile: myProfile });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(mockedFetch).toHaveBeenCalledWith(ME, {}, {
      revalidate: 0,
      accessToken: "access-token-1",
    });
    expect(mockedFetch).toHaveBeenCalledWith(MY_PROFILE, {}, {
      revalidate: 0,
      accessToken: "access-token-1",
    });
  });

  it("redirects through the refresh route when the token is missing but a refresh cookie exists (PROFILE-02)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue("refresh-token-1");

    await expect(getPersonalInfoPageData(PATH)).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith(
      "/api/auth/refresh?redirectTo=%2Faccount%2Fpersonal-info",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("redirects to login when there are no cookies (PROFILE-02)", async () => {
    mockedReadAccessToken.mockResolvedValue(undefined);
    mockedReadRefreshToken.mockResolvedValue(undefined);

    await expect(getPersonalInfoPageData(PATH)).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fpersonal-info",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("rethrows other errors, such as a missing profile, for the route error boundary", async () => {
    mockedReadAccessToken.mockResolvedValue("access-token-1");
    const failure = new Error("PROFILE_NOT_FOUND");
    mockedFetch.mockRejectedValue(failure);

    await expect(getPersonalInfoPageData(PATH)).rejects.toBe(failure);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends a rejected access token through the refresh route", async () => {
    mockedReadAccessToken.mockResolvedValue("stale-token");
    mockedFetch.mockRejectedValue(
      new GraphQLRequestError("Unauthorized", "UNAUTHENTICATED"),
    );

    await expect(getPersonalInfoPageData(PATH)).rejects.toBe(REDIRECT_ERROR);
    expect(redirect).toHaveBeenCalledWith(
      "/api/auth/refresh?redirectTo=%2Faccount%2Fpersonal-info",
    );
  });
});
