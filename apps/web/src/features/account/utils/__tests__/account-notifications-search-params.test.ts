import { describe, expect, it } from "vitest";
import {
  NOTIFICATIONS_PAGE_SIZE,
  loadAccountNotificationsSearchParams,
  serializeAccountNotificationsSearchParams,
} from "@/features/account/utils/account-notifications-search-params";
import { paths } from "@/config/paths";

const defaults = { tab: "all", page: 1 };

describe("paths.accountNotifications", () => {
  it("is /account/notifications (NOTIF-13)", () => {
    expect(paths.accountNotifications.getHref()).toBe("/account/notifications");
  });
});

describe("NOTIFICATIONS_PAGE_SIZE", () => {
  it("shows 10 notifications per page (View AC 7)", () => {
    expect(NOTIFICATIONS_PAGE_SIZE).toBe(10);
  });
});

describe("loadAccountNotificationsSearchParams", () => {
  it("reads the All tab and page 1 when no param is set (View AC 4)", () => {
    expect(loadAccountNotificationsSearchParams("")).toEqual(defaults);
  });

  it("parses a valid value for every param", () => {
    expect(loadAccountNotificationsSearchParams("?tab=unread&page=3")).toEqual({
      tab: "unread",
      page: 3,
    });
  });

  it.each(["all", "unread", "read"] as const)("parses tab=%s", (tab) => {
    expect(loadAccountNotificationsSearchParams(`?tab=${tab}`).tab).toBe(tab);
  });

  // View AC 9: each unknown or out-of-range value falls back to its default.
  it.each([
    ["tab", "bogus"],
    ["page", "0"],
    ["page", "-1"],
    ["page", "1.5"],
    ["page", "abc"],
  ])("falls back to the default for %s=%s (View AC 9)", (param, value) => {
    expect(
      loadAccountNotificationsSearchParams(
        new URLSearchParams({ [param]: value }),
      ),
    ).toEqual(defaults);
  });
});

describe("serializeAccountNotificationsSearchParams", () => {
  const base = paths.accountNotifications.getHref();

  it("omits the defaults", () => {
    expect(
      serializeAccountNotificationsSearchParams(base, { tab: "all", page: 1 }),
    ).toBe("/account/notifications");
  });

  it("builds the tab and page URL", () => {
    expect(
      serializeAccountNotificationsSearchParams(base, {
        tab: "read",
        page: 2,
      }),
    ).toBe("/account/notifications?tab=read&page=2");
  });

  it("drops page when only the tab is given (View AC 10)", () => {
    expect(
      serializeAccountNotificationsSearchParams(base, { tab: "unread" }),
    ).toBe("/account/notifications?tab=unread");
  });
});
