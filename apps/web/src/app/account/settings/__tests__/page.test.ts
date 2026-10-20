import { Children, isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_SETTINGS } from "@/testing/account-settings.fixture";
import { getSettingsPageData } from "@/features/account/api/get-settings-page-data";
import { updateSettingsAction } from "@/features/account/api/update-settings-action";
import { deleteAccountAction } from "@/features/account/api/delete-account-action";
import { SettingsView } from "@/features/account/components/settings-view";
import { DeleteAccountSection } from "@/features/account/components/delete-account-section";
import SettingsPage from "@/app/account/settings/page";
vi.mock("@/features/account/api/get-settings-page-data", () => ({
  getSettingsPageData: vi.fn(),
}));
vi.mock("@/features/account/api/update-settings-action", () => ({
  updateSettingsAction: vi.fn(),
}));
vi.mock("@/features/account/api/delete-account-action", () => ({
  deleteAccountAction: vi.fn(),
}));
vi.mock("@/features/account/components/settings-view", () => ({
  SettingsView: vi.fn(),
}));
vi.mock("@/features/account/components/delete-account-section", () => ({
  DeleteAccountSection: vi.fn(),
}));

describe("settings page (SET-02,05,06; WEB-01)", () => {
  beforeEach(() => vi.clearAllMocks());
  it("composes the screen from the protected loader and real save action", async () => {
    vi.mocked(getSettingsPageData).mockResolvedValue(ACCOUNT_SETTINGS);
    const page = await SettingsPage();
    const [settings] = Children.toArray(page.props.children);
    expect(isValidElement(settings) && settings.type).toBe(SettingsView);
    expect(isValidElement(settings) && settings.props).toEqual({
      settings: ACCOUNT_SETTINGS,
      action: updateSettingsAction,
    });
  });
  it("renders the delete account section below the settings, wired to the real action", async () => {
    vi.mocked(getSettingsPageData).mockResolvedValue(ACCOUNT_SETTINGS);
    const page = await SettingsPage();
    const children = Children.toArray(page.props.children);
    expect(children).toHaveLength(2);
    const [settings, section] = children;
    expect(isValidElement(settings) && settings.type).toBe(SettingsView);
    expect(isValidElement(section) && section.type).toBe(DeleteAccountSection);
    expect(isValidElement(section) && section.props).toEqual({
      action: deleteAccountAction,
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
