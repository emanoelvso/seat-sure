import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { GraphQLRequestError, graphqlServerFetch } from "@/lib/graphql-server";
import {
  readAccessToken,
  readRefreshToken,
} from "@/features/auth/api/session-cookies";
import { MY_SETTINGS } from "@/features/account/api/find-my-settings";
import { getSettingsPageData } from "@/features/account/api/get-settings-page-data";

const { REDIRECT } = vi.hoisted(() => ({
  REDIRECT: new Error("NEXT_REDIRECT"),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT;
  }),
}));
vi.mock("@/features/auth/api/session-cookies");
vi.mock("@/lib/graphql-server", async () => ({
  ...(await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  )),
  graphqlServerFetch: vi.fn(),
}));
const settings = {
  eventReminders: true,
  exclusiveOffers: false,
  ticketAvailability: true,
  emailNotifications: false,
  pushNotifications: true,
  language: "pt-BR",
};

describe("getSettingsPageData (SET-04,05,06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readAccessToken).mockResolvedValue("access");
    vi.mocked(readRefreshToken).mockResolvedValue(undefined);
    vi.mocked(graphqlServerFetch).mockResolvedValue({ mySettings: settings });
  });
  it("returns the caller's exact stored settings without caching", async () => {
    expect(await getSettingsPageData()).toEqual(settings);
    expect(graphqlServerFetch).toHaveBeenCalledWith(
      MY_SETTINGS,
      {},
      { revalidate: 0, accessToken: "access" },
    );
  });
  it("redirects a signed-out visitor to login with the settings return path", async () => {
    vi.mocked(readAccessToken).mockResolvedValue(undefined);
    await expect(getSettingsPageData()).rejects.toBe(REDIRECT);
    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fsettings",
    );
    expect(graphqlServerFetch).not.toHaveBeenCalled();
  });
  it("refreshes a missing access token when a refresh cookie exists", async () => {
    vi.mocked(readAccessToken).mockResolvedValue(undefined);
    vi.mocked(readRefreshToken).mockResolvedValue("refresh");
    await expect(getSettingsPageData()).rejects.toBe(REDIRECT);
    expect(redirect).toHaveBeenCalledWith(
      "/api/auth/refresh?redirectTo=%2Faccount%2Fsettings",
    );
  });
  it("refreshes a rejected session with the settings return path", async () => {
    vi.mocked(graphqlServerFetch).mockRejectedValue(
      new GraphQLRequestError("Expired", "UNAUTHENTICATED"),
    );
    await expect(getSettingsPageData()).rejects.toBe(REDIRECT);
    expect(redirect).toHaveBeenCalledWith(
      "/api/auth/refresh?redirectTo=%2Faccount%2Fsettings",
    );
  });
  it.each([
    new Error("Network unavailable"),
    new GraphQLRequestError("Database unavailable", "INTERNAL_SERVER_ERROR"),
  ])("propagates load failures to the route boundary", async (error) => {
    vi.mocked(graphqlServerFetch).mockRejectedValue(error);
    await expect(getSettingsPageData()).rejects.toBe(error);
    expect(redirect).not.toHaveBeenCalled();
  });
});
