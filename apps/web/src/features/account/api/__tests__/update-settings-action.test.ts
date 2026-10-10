import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { graphqlServerFetch } from "@/lib/graphql-server";
import {
  NO_SESSION,
  withAccessToken,
} from "@/features/auth/api/with-access-token";
import { UPDATE_MY_SETTINGS } from "@/features/account/api/update-my-settings";
import { updateSettingsAction } from "@/features/account/api/update-settings-action";

const { REDIRECT } = vi.hoisted(() => ({
  REDIRECT: new Error("NEXT_REDIRECT"),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw REDIRECT;
  }),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/graphql-server", async () => ({
  ...(await vi.importActual<typeof import("@/lib/graphql-server")>(
    "@/lib/graphql-server",
  )),
  graphqlServerFetch: vi.fn(),
}));
vi.mock("@/features/auth/api/with-access-token", async () => ({
  ...(await vi.importActual<
    typeof import("@/features/auth/api/with-access-token")
  >("@/features/auth/api/with-access-token")),
  withAccessToken: vi.fn(),
}));
const ERROR = { error: "Couldn't save your settings. Please try again." };

describe("updateSettingsAction (SET-07,08,11,14,18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(withAccessToken).mockImplementation((fn) => fn("access"));
    vi.mocked(graphqlServerFetch).mockResolvedValue({ updateMySettings: {} });
  });
  it.each([
    { eventReminders: true },
    { eventReminders: false },
    { exclusiveOffers: false },
    { ticketAvailability: true },
    { emailNotifications: false },
    { pushNotifications: true },
    { language: "en" as const },
    { language: "pt-BR" as const },
  ])(
    "saves only %j using the session and refreshes server props",
    async (patch) => {
      expect(await updateSettingsAction(patch)).toEqual({ ok: true });
      expect(graphqlServerFetch).toHaveBeenCalledWith(
        UPDATE_MY_SETTINGS,
        { input: patch },
        { revalidate: 0, accessToken: "access" },
      );
      expect(refresh).toHaveBeenCalledOnce();
    },
  );
  it.each([
    {},
    null,
    { language: "xx" },
    { eventReminders: "true" },
    { eventReminders: null },
    { language: null },
    { eventReminders: true, language: "en" },
    { unknownSetting: true },
    { userId: "another", eventReminders: true },
  ])("rejects %j before issuing a mutation", async (patch) => {
    expect(await updateSettingsAction(patch as never)).toEqual(ERROR);
    expect(graphqlServerFetch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
  it("returns the exact retryable error when the API fails", async () => {
    vi.mocked(graphqlServerFetch).mockRejectedValue(
      new Error("Network unavailable"),
    );
    expect(await updateSettingsAction({ eventReminders: true })).toEqual(ERROR);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("returns the same error when session refresh fails", async () => {
    vi.mocked(withAccessToken).mockRejectedValue(
      new Error("Refresh unavailable"),
    );
    expect(await updateSettingsAction({ language: "pt-BR" })).toEqual(ERROR);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("redirects an unrefreshable session without swallowing the redirect", async () => {
    vi.mocked(withAccessToken).mockResolvedValue(NO_SESSION);
    await expect(updateSettingsAction({ eventReminders: true })).rejects.toBe(
      REDIRECT,
    );
    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Faccount%2Fsettings",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
