import { describe, expect, it } from "vitest";
import {
  ACCOUNT_ORDERS_PAGE_SIZE,
  loadAccountOrdersSearchParams,
  serializeAccountOrdersSearchParams,
} from "@/features/account/utils/account-orders-search-params";
import { paths } from "@/config/paths";

const defaults = { status: "all", sort: "newest", page: 1 };

describe("ACCOUNT_ORDERS_PAGE_SIZE", () => {
  it("shows 4 orders per page (ORDLIST-05)", () => {
    expect(ACCOUNT_ORDERS_PAGE_SIZE).toBe(4);
  });
});

describe("loadAccountOrdersSearchParams", () => {
  it("reads all, newest first and page 1 when no param is set (ORDLIST-02, ORDLIST-04)", () => {
    expect(loadAccountOrdersSearchParams("")).toEqual(defaults);
  });

  it("parses a valid value for every param", () => {
    expect(
      loadAccountOrdersSearchParams("?status=pending&sort=highest&page=3"),
    ).toEqual({ status: "pending", sort: "highest", page: 3 });
  });

  it.each(["all", "pending", "canceled", "completed"] as const)(
    "parses status=%s (ORDLIST-02)",
    (status) => {
      expect(loadAccountOrdersSearchParams(`?status=${status}`).status).toBe(
        status,
      );
    },
  );

  it.each(["newest", "oldest", "highest", "lowest"] as const)(
    "parses sort=%s (ORDLIST-04)",
    (sort) => {
      expect(loadAccountOrdersSearchParams(`?sort=${sort}`).sort).toBe(sort);
    },
  );

  // ORDLIST-06: each unknown or out-of-range value falls back to its default.
  it.each([
    ["status", "bogus"],
    ["sort", "bogus"],
    ["page", "0"],
    ["page", "-1"],
    ["page", "1.5"],
    ["page", "x"],
  ])("falls back to the default for %s=%s (ORDLIST-06)", (param, value) => {
    expect(
      loadAccountOrdersSearchParams(new URLSearchParams({ [param]: value })),
    ).toEqual(defaults);
  });
});

describe("serializeAccountOrdersSearchParams", () => {
  const base = paths.accountTickets.getHref();

  it("builds the status and page URL (ORDLIST-02)", () => {
    expect(
      serializeAccountOrdersSearchParams(base, { status: "pending", page: 2 }),
    ).toBe("/account/tickets?status=pending&page=2");
  });

  it("builds the status and sort URL (ORDLIST-02, ORDLIST-04)", () => {
    expect(
      serializeAccountOrdersSearchParams(base, {
        status: "canceled",
        sort: "oldest",
      }),
    ).toBe("/account/tickets?status=canceled&sort=oldest");
  });
});
