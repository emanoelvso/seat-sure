import { beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { protectedPageFetch } from "@/features/auth/api/protected-page-fetch";
import { FIND_ACCOUNT_ORDERS } from "@/features/account/api/find-account-orders";
import { getAccountOrders } from "@/features/account/api/get-account-orders";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server");
vi.mock("@/features/auth/api/protected-page-fetch", () => ({
  protectedPageFetch: vi.fn(
    (_path: string, fn: (token: string) => Promise<unknown>) =>
      fn("access-token-1"),
  ),
}));

const mockedFetch = vi.mocked(graphqlServerFetch);

const ordersPage = {
  __typename: "AccountOrdersPage" as const,
  items: [],
  counts: {
    __typename: "AccountOrderCounts" as const,
    all: 0,
    pending: 0,
    cancelled: 0,
    completed: 0,
  },
  page: 1,
  totalPages: 0,
};

describe("getAccountOrders", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedFetch.mockResolvedValue({ findAccountOrders: ordersPage });
  });

  it.each([
    ["all", "ALL"],
    ["pending", "PENDING"],
    ["canceled", "CANCELLED"],
    ["completed", "COMPLETED"],
  ] as const)("maps status=%s to tab %s (ORDLIST-02)", async (status, tab) => {
    await getAccountOrders(
      { status, sort: "newest", page: 1 },
      "/account/tickets",
    );

    expect(mockedFetch.mock.calls[0][1]).toEqual({
      input: { tab, sort: "NEWEST", page: 1, pageSize: 4 },
    });
  });

  it.each([
    ["newest", "NEWEST"],
    ["oldest", "OLDEST"],
    ["highest", "HIGHEST_AMOUNT"],
    ["lowest", "LOWEST_AMOUNT"],
  ] as const)("maps sort=%s to %s (ORDLIST-04)", async (sort, apiSort) => {
    await getAccountOrders(
      { status: "all", sort, page: 1 },
      "/account/tickets",
    );

    expect(mockedFetch.mock.calls[0][1]).toEqual({
      input: { tab: "ALL", sort: apiSort, page: 1, pageSize: 4 },
    });
  });

  it("sends the requested page (ORDLIST-05)", async () => {
    await getAccountOrders(
      { status: "pending", sort: "oldest", page: 3 },
      "/account/tickets",
    );

    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_ACCOUNT_ORDERS,
      { input: { tab: "PENDING", sort: "OLDEST", page: 3, pageSize: 4 } },
      { revalidate: 0, accessToken: "access-token-1" },
    );
  });

  it("returns the page and guards the load with the current path (ACCT-03)", async () => {
    const result = await getAccountOrders(
      { status: "all", sort: "newest", page: 1 },
      "/account/tickets?status=all",
    );

    expect(result).toEqual(ordersPage);
    expect(protectedPageFetch).toHaveBeenCalledWith(
      "/account/tickets?status=all",
      expect.any(Function),
    );
  });
});
