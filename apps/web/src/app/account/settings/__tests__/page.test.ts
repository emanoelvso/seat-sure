import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_SETTINGS } from "@/testing/account-settings.fixture";
import { getSettingsPageData } from "@/features/account/api/get-settings-page-data";
import { updateSettingsAction } from "@/features/account/api/update-settings-action";
import { SettingsView } from "@/features/account/components/settings-view";
import SettingsPage from "@/app/account/settings/page";
vi.mock("@/features/account/api/get-settings-page-data", () => ({
  getSettingsPageData: vi.fn(),
}));
vi.mock("@/features/account/api/update-settings-action", () => ({
  updateSettingsAction: vi.fn(),
}));
vi.mock("@/features/account/components/settings-view", () => ({
  SettingsView: vi.fn(),
}));

describe("settings page (SET-02,05,06)", () => {
  beforeEach(() => vi.clearAllMocks());
  it("composes the screen from the protected loader and real save action", async () => {
    vi.mocked(getSettingsPageData).mockResolvedValue(ACCOUNT_SETTINGS);
    const page = await SettingsPage();
    expect(page.type).toBe(SettingsView);
    expect(page.props).toEqual({
      settings: ACCOUNT_SETTINGS,
      action: updateSettingsAction,
    });
  });
  it.each([new Error("NEXT_REDIRECT"), new Error("Database unavailable")])(
    "propagates protected loader redirects and errors",
    async (error) => {
      vi.mocked(getSettingsPageData).mockRejectedValue(error);
      await expect(SettingsPage()).rejects.toBe(error);
    },
  );
});
